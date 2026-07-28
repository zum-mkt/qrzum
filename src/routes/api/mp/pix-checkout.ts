import { createFileRoute } from "@tanstack/react-router";
import { getEnvVar } from "@/lib/cloudflare-context";

const MP_API = "https://api.mercadopago.com";
const PIX_EXPIRATION_MINUTES = 30;

function pixExpirationIso(): string {
  const expires = new Date(Date.now() + PIX_EXPIRATION_MINUTES * 60 * 1000);
  // Brazil has no DST since 2019 — fixed -03:00 offset is safe here.
  return expires.toISOString().replace("Z", "-03:00");
}

export const Route = createFileRoute("/api/mp/pix-checkout")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const accessToken = getEnvVar("MP_ACCESS_TOKEN");
        if (!accessToken) {
          return new Response(JSON.stringify({ error: "MP not configured" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        const authHeader = request.headers.get("authorization") || "";
        const jwt = authHeader.replace(/^Bearer\s+/i, "");
        if (!jwt) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        let body: {
          plan_id?: string;
          period?: "monthly" | "annual";
          payer_email?: string;
          payer_name?: string;
          cpf?: string;
        } = {};
        try {
          body = await request.json();
        } catch {
          /* ignore */
        }

        const { plan_id, period, payer_email, payer_name, cpf } = body;
        if (!plan_id || !period || !payer_email || !payer_name || !cpf) {
          return new Response(JSON.stringify({ error: "Missing required fields" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const admin = supabaseAdmin as any;

          const {
            data: { user },
            error: authError,
          } = await admin.auth.getUser(jwt);
          if (authError || !user) {
            return new Response(JSON.stringify({ error: "Invalid token" }), {
              status: 401,
              headers: { "Content-Type": "application/json" },
            });
          }

          const { data: plan, error: planError } = await admin
            .from("pricing_plans")
            .select("id, name, price_monthly, price_annual")
            .eq("id", plan_id)
            .maybeSingle();

          if (planError || !plan) {
            return new Response(JSON.stringify({ error: "Plan not found" }), {
              status: 404,
              headers: { "Content-Type": "application/json" },
            });
          }

          const amountCents: number = period === "annual" ? plan.price_annual : plan.price_monthly;
          if (!amountCents || amountCents <= 0) {
            return new Response(JSON.stringify({ error: "Plan price not configured" }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            });
          }

          const amountBRL = amountCents / 100;
          const isAnnual = period === "annual";

          // Reuse an existing pending Pix subscription for the same plan/period, else create one
          const { data: existing } = await admin
            .from("user_subscriptions")
            .select("id")
            .eq("user_id", user.id)
            .eq("plan_id", plan_id)
            .eq("period", period)
            .eq("payment_method", "pix")
            .in("status", ["pending", "authorized"])
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          let subscriptionId = existing?.id as string | undefined;
          if (!subscriptionId) {
            const { data: created, error: createError } = await admin
              .from("user_subscriptions")
              .insert({
                user_id: user.id,
                plan_id,
                period,
                status: "pending",
                payment_method: "pix",
                mp_payer_email: payer_email,
              })
              .select("id")
              .single();

            if (createError || !created) {
              console.error("[pix-checkout] failed to create subscription:", createError);
              return new Response(JSON.stringify({ error: "Failed to create subscription" }), {
                status: 500,
                headers: { "Content-Type": "application/json" },
              });
            }
            subscriptionId = created.id;
          }

          const [firstName, ...rest] = payer_name.trim().split(/\s+/);
          const lastName = rest.join(" ") || firstName;

          const mpBody = {
            transaction_amount: amountBRL,
            description: `${plan.name} – ${isAnnual ? "Anual" : "Mensal"}`,
            payment_method_id: "pix",
            payer: {
              email: payer_email,
              first_name: firstName,
              last_name: lastName,
              identification: { type: "CPF", number: cpf.replace(/\D/g, "") },
            },
            external_reference: subscriptionId,
            date_of_expiration: pixExpirationIso(),
          };

          const mpRes = await fetch(`${MP_API}/v1/payments`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
              "X-Idempotency-Key": crypto.randomUUID(),
            },
            body: JSON.stringify(mpBody),
          });

          const mpData = (await mpRes.json()) as Record<string, unknown>;
          if (!mpRes.ok) {
            console.error("[MP] pix payment error:", mpData);
            return new Response(
              JSON.stringify({ error: (mpData as any).message || "Payment failed" }),
              { status: 400, headers: { "Content-Type": "application/json" } },
            );
          }

          const mpPayment = mpData as {
            id: number;
            status: string;
            point_of_interaction?: {
              transaction_data?: { qr_code?: string; qr_code_base64?: string };
            };
          };

          await admin.from("subscription_payments").upsert(
            {
              subscription_id: subscriptionId,
              user_id: user.id,
              mp_payment_id: String(mpPayment.id),
              amount: amountCents,
              status: mpPayment.status,
            },
            { onConflict: "mp_payment_id" },
          );

          const qrCode = mpPayment.point_of_interaction?.transaction_data?.qr_code;
          const qrCodeBase64 = mpPayment.point_of_interaction?.transaction_data?.qr_code_base64;
          if (!qrCode || !qrCodeBase64) {
            return new Response(
              JSON.stringify({ error: "Pix QR code not returned by Mercado Pago" }),
              {
                status: 502,
                headers: { "Content-Type": "application/json" },
              },
            );
          }

          return new Response(
            JSON.stringify({
              success: true,
              subscription_id: subscriptionId,
              payment_id: mpPayment.id,
              qr_code: qrCode,
              qr_code_base64: qrCodeBase64,
              expires_at: mpBody.date_of_expiration,
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        } catch (err) {
          console.error("[mp/pix-checkout]", err);
          return new Response(JSON.stringify({ error: "Internal server error" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
      OPTIONS: async () => new Response(null, { status: 204 }),
    },
  },
});
