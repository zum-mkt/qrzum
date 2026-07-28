const GRACE_PERIOD_DAYS = 3;

// Pix subscriptions have no auto-recurring on Mercado Pago's side — nothing flips their
// status when a cycle isn't renewed, unlike card preapproval (MP itself pauses/cancels those).
// This runs on a daily Cron Trigger to cut access once the grace period has passed.
export async function expireLapsedPixSubscriptions(): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const admin = supabaseAdmin as any;

  const cutoff = new Date(Date.now() - GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data: lapsed, error } = await admin
    .from("user_subscriptions")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("payment_method", "pix")
    .eq("status", "authorized")
    .lt("current_period_end", cutoff)
    .select("id");

  if (error) {
    console.error("[pix-expire] failed:", error);
    return;
  }
  if (lapsed?.length) {
    console.log(`[pix-expire] cancelled ${lapsed.length} lapsed Pix subscription(s)`);
  }
}
