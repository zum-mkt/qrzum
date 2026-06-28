import { createFileRoute } from "@tanstack/react-router";

const MP_API = "https://api.mercadopago.com";

export const Route = createFileRoute("/api/mp/subscribe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const accessToken = process.env.MP_ACCESS_TOKEN;
        if (!accessToken) {
          return new Response(JSON.stringify({ error: "MP not configured" }), {
            status: 500, headers: { "Content-Type": "application/json" },
          });
        }

        // Verify Supabase JWT to get user_id
        const authHeader = request.headers.get("authorization") || "";
        const jwt = authHeader.replace(/^Bearer\s+/i, "");
        if (!jwt) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401, headers: { "Content-Type": "application/json" },
          });
        }

        let body: {
          plan_id?: string;
          period?: "monthly" | "annual";
          card_token?: string;
          payer_email?: string;
          payer_name?: string;
          cpf?: string;
        } = {};
        try { body = await request.json(); } catch { /* ignore */ }

        const { plan_id, period, card_token, payer_email, payer_name, cpf } = body;
        if (!plan_id || !period || !card_token || !payer_email || !payer_name || !cpf) {
          return new Response(JSON.stringify({ error: "Missing required fields" }), {
            status: 400, headers: { "Content-Type": "application/json" },
          });
        }

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const admin = supabaseAdmin as any;

          // Verify user JWT
          const { data: { user }, error: authError } = await admin.auth.getUser(jwt);
          if (authError || !user) {
            return new Response(JSON.stringify({ error: "Invalid token" }), {
              status: 401, headers: { "Content-Type": "application/json" },
            });
          }

          // Get plan price
          const { data: plan, error: planError } = await admin
            .from("pricing_plans")
            .select("id, name, price_monthly, price_annual")
            .eq("id", plan_id)
            .maybeSingle();

          if (planError || !plan) {
            return new Response(JSON.stringify({ error: "Plan not found" }), {
              status: 404, headers: { "Content-Type": "application/json" },
            });
          }

          const amountCents: number = period === "annual" ? plan.price_annual : plan.price_monthly;
          if (!amountCents || amountCents <= 0) {
            return new Response(JSON.stringify({ error: "Plan price not configured" }), {
              status: 400, headers: { "Content-Type": "application/json" },
            });
          }

          const amountBRL = (amountCents / 100).toFixed(2);
          const isAnnual = period === "annual";

          // Create MP Preapproval (subscription)
          const mpBody = {
            back_url: `${process.env.VITE_APP_URL || "https://qrzum.morning-mouse-a96d.workers.dev"}/billing`,
            reason: `${plan.name} – ${isAnnual ? "Anual" : "Mensal"}`,
            payer_email: payer_email,
            card_token_id: card_token,
            auto_recurring: {
              frequency: isAnnual ? 12 : 1,
              frequency_type: "months",
              transaction_amount: parseFloat(amountBRL),
              currency_id: "BRL",
            },
            status: "authorized",
          };

          const mpRes = await fetch(`${MP_API}/preapproval`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify(mpBody),
          });

          const mpData = await mpRes.json() as Record<string, unknown>;
          if (!mpRes.ok) {
            console.error("[MP] preapproval error:", mpData);
            return new Response(
              JSON.stringify({ error: (mpData as any).message || "Payment failed" }),
              { status: 400, headers: { "Content-Type": "application/json" } },
            );
          }

          const mpSub = mpData as {
            id: string;
            status: string;
            next_payment_date?: string;
          };

          // Cancel any existing active subscription for this user
          await admin
            .from("user_subscriptions")
            .update({ status: "cancelled", updated_at: new Date().toISOString() })
            .eq("user_id", user.id)
            .in("status", ["authorized", "pending"]);

          // Save subscription in DB
          const periodEnd = mpSub.next_payment_date
            ? new Date(mpSub.next_payment_date).toISOString()
            : null;

          await admin.from("user_subscriptions").insert({
            user_id: user.id,
            plan_id,
            period,
            status: mpSub.status === "authorized" ? "authorized" : "pending",
            mp_subscription_id: mpSub.id,
            mp_payer_email: payer_email,
            current_period_end: periodEnd,
          });

          return new Response(
            JSON.stringify({ success: true, subscription_id: mpSub.id, status: mpSub.status }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        } catch (err) {
          console.error("[mp/subscribe]", err);
          return new Response(JSON.stringify({ error: "Internal server error" }), {
            status: 500, headers: { "Content-Type": "application/json" },
          });
        }
      },
      OPTIONS: async () => new Response(null, { status: 204 }),
    },
  },
});
