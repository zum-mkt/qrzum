import { createFileRoute } from "@tanstack/react-router";
import { createHmac } from "crypto";
import { getEnvVar } from "@/lib/cloudflare-context";

const MP_API = "https://api.mercadopago.com";

async function validateMpSignature(request: Request, rawBody: string): Promise<boolean> {
  const secret = getEnvVar("MP_WEBHOOK_SECRET");
  if (!secret) return true; // skip validation if secret not configured

  const xSignature = request.headers.get("x-signature") || "";
  const xRequestId = request.headers.get("x-request-id") || "";

  // Parse ts and v1 from "ts=xxx,v1=yyy"
  const parts = Object.fromEntries(xSignature.split(",").map((p) => p.split("=")));
  const ts = parts["ts"];
  const v1 = parts["v1"];
  if (!ts || !v1) return false;

  // Extract data.id from body
  let dataId = "";
  try { dataId = (JSON.parse(rawBody) as { data?: { id?: string } }).data?.id ?? ""; } catch { /* ignore */ }

  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  const expectedHash = createHmac("sha256", secret).update(manifest).digest("hex");

  return expectedHash === v1;
}

export const Route = createFileRoute("/api/mp/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const accessToken = getEnvVar("MP_ACCESS_TOKEN");
        if (!accessToken) return new Response("ok", { status: 200 });

        const rawBody = await request.text();

        // Validate MP signature
        const valid = await validateMpSignature(request, rawBody);
        if (!valid) {
          console.warn("[mp/webhook] invalid signature");
          return new Response("unauthorized", { status: 401 });
        }

        let body: { type?: string; data?: { id?: string } } = {};
        try { body = JSON.parse(rawBody); } catch { /* ignore */ }

        // MP sends type=payment or type=subscription_preapproval
        const eventType = body.type;
        const resourceId = body.data?.id;

        if (!resourceId) return new Response("ok", { status: 200 });

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const admin = supabaseAdmin as any;

          if (eventType === "payment") {
            // Fetch payment details from MP
            const res = await fetch(`${MP_API}/v1/payments/${resourceId}`, {
              headers: { Authorization: `Bearer ${accessToken}` },
            });
            if (!res.ok) return new Response("ok", { status: 200 });

            const payment = await res.json() as {
              id: number;
              status: string;
              transaction_amount: number;
              date_approved?: string;
              metadata?: { preapproval_id?: string };
              external_reference?: string;
            };

            const mpPaymentId = String(payment.id);
            const amountCents = Math.round(payment.transaction_amount * 100);
            const paidAt = payment.date_approved ? new Date(payment.date_approved).toISOString() : null;

            // Find subscription by MP subscription ID (may be in metadata or external_reference)
            const preapprovalId = payment.metadata?.preapproval_id || payment.external_reference;
            let subscriptionId: string | null = null;
            let userId: string | null = null;

            if (preapprovalId) {
              const { data: sub } = await admin
                .from("user_subscriptions")
                .select("id, user_id")
                .eq("mp_subscription_id", preapprovalId)
                .maybeSingle();
              if (sub) { subscriptionId = sub.id; userId = sub.user_id; }
            }

            // Upsert payment record
            await admin.from("subscription_payments").upsert(
              {
                subscription_id: subscriptionId,
                user_id: userId,
                mp_payment_id: mpPaymentId,
                amount: amountCents,
                status: payment.status,
                paid_at: paidAt,
              },
              { onConflict: "mp_payment_id" },
            );

            // Update subscription status if payment approved
            if (subscriptionId && payment.status === "approved") {
              await admin
                .from("user_subscriptions")
                .update({ status: "authorized", updated_at: new Date().toISOString() })
                .eq("id", subscriptionId);
            }
          }

          if (eventType === "subscription_preapproval") {
            // Fetch subscription details from MP
            const res = await fetch(`${MP_API}/preapproval/${resourceId}`, {
              headers: { Authorization: `Bearer ${accessToken}` },
            });
            if (!res.ok) return new Response("ok", { status: 200 });

            const sub = await res.json() as {
              id: string;
              status: string;
              next_payment_date?: string;
            };

            const newStatus =
              sub.status === "authorized" ? "authorized"
              : sub.status === "paused" ? "paused"
              : sub.status === "cancelled" ? "cancelled"
              : "pending";

            await admin
              .from("user_subscriptions")
              .update({
                status: newStatus,
                current_period_end: sub.next_payment_date
                  ? new Date(sub.next_payment_date).toISOString()
                  : null,
                updated_at: new Date().toISOString(),
              })
              .eq("mp_subscription_id", sub.id);
          }
        } catch (err) {
          console.error("[mp/webhook]", err);
        }

        return new Response("ok", { status: 200 });
      },
      OPTIONS: async () => new Response(null, { status: 204 }),
    },
  },
});
