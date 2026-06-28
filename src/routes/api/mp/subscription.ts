import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/mp/subscription")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const authHeader = request.headers.get("authorization") || "";
        const jwt = authHeader.replace(/^Bearer\s+/i, "");
        if (!jwt) {
          return new Response(JSON.stringify({ subscription: null }), {
            status: 200, headers: { "Content-Type": "application/json" },
          });
        }

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const admin = supabaseAdmin as any;

          const { data: { user } } = await admin.auth.getUser(jwt);
          if (!user) {
            return new Response(JSON.stringify({ subscription: null }), {
              status: 200, headers: { "Content-Type": "application/json" },
            });
          }

          const { data: sub } = await admin
            .from("user_subscriptions")
            .select(`
              id, period, status, mp_payer_email, current_period_end, created_at,
              plan:pricing_plans ( id, name, slug )
            `)
            .eq("user_id", user.id)
            .in("status", ["authorized", "pending", "paused"])
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          return new Response(JSON.stringify({ subscription: sub ?? null }), {
            status: 200, headers: { "Content-Type": "application/json" },
          });
        } catch (err) {
          console.error("[mp/subscription]", err);
          return new Response(JSON.stringify({ subscription: null }), {
            status: 200, headers: { "Content-Type": "application/json" },
          });
        }
      },
      OPTIONS: async () => new Response(null, { status: 204 }),
    },
  },
});
