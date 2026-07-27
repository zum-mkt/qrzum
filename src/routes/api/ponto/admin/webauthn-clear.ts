import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/ponto/admin/webauthn-clear")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: { employeeId?: string };
        try { body = await request.json() as typeof body; }
        catch { return new Response("Bad request", { status: 400 }); }
        if (!body.employeeId) return new Response("Missing employeeId", { status: 400 });

        const authHeader = request.headers.get("Authorization");
        const token = authHeader?.replace("Bearer ", "");
        if (!token) return new Response("Unauthorized", { status: 401 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: { user } } = await supabaseAdmin.auth.getUser(token);
        if (!user) return new Response("Unauthorized", { status: 401 });

        const { data: emp } = await supabaseAdmin
          .from("employees").select("id, user_id").eq("id", body.employeeId).maybeSingle();

        if (!emp || emp.user_id !== user.id) {
          return new Response("Not found", { status: 404 });
        }

        await supabaseAdmin.from("employee_webauthn_credentials").delete().eq("employee_id", body.employeeId);
        await supabaseAdmin.from("ponto_webauthn_challenges").delete().eq("employee_id", body.employeeId);

        return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
      },
    },
  },
});
