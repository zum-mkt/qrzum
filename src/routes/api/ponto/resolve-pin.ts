import { createFileRoute } from "@tanstack/react-router";
import { rateLimit } from "@/lib/rate-limit";

export const Route = createFileRoute("/api/ponto/resolve-pin")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const ip = (
          request.headers.get("cf-connecting-ip") ||
          request.headers.get("x-forwarded-for") ||
          "anon"
        ).split(",")[0].trim();

        // 5 PIN attempts per 60s per IP
        if (!rateLimit(`pin:${ip}`, 5, 60_000)) {
          return new Response(JSON.stringify({ error: "rate_limited" }), {
            status: 429, headers: { "Content-Type": "application/json" },
          });
        }

        let body: { qrId?: string; pin?: string; deviceId?: string | null };
        try { body = await request.json() as typeof body; }
        catch { return new Response("Bad request", { status: 400 }); }

        if (!body.qrId || !body.pin) {
          return new Response("Missing fields", { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: qr } = await supabaseAdmin
          .from("qr_links").select("user_id").eq("id", body.qrId).eq("type", "ponto").maybeSingle();
        if (!qr) return new Response("QR not found", { status: 404 });

        // Validate PIN
        const { data: empRpc } = await supabaseAdmin.rpc("resolve_employee_by_pin", {
          p_user_id: qr.user_id, p_pin: body.pin,
        });
        if (!empRpc?.length) {
          return new Response(JSON.stringify({ error: "pin_invalid" }), {
            status: 401, headers: { "Content-Type": "application/json" },
          });
        }

        const { data: emp } = await supabaseAdmin
          .from("employees").select("id, name, role, device_id")
          .eq("id", empRpc[0].id).maybeSingle();
        if (!emp) return new Response("Employee not found", { status: 404 });

        // Device check — block if employee has a bound device and submitted ID doesn't match
        const deviceId = body.deviceId ?? null;
        if (emp.device_id && emp.device_id !== (deviceId ?? "")) {
          return new Response(JSON.stringify({ error: "device_unauthorized" }), {
            status: 403, headers: { "Content-Type": "application/json" },
          });
        }

        // Bind device on first use
        let deviceFirstBind = false;
        if (!emp.device_id && deviceId) {
          await supabaseAdmin.from("employees").update({ device_id: deviceId }).eq("id", emp.id);
          deviceFirstBind = true;
        }

        // WebAuthn credential check
        const { data: webauthnCred } = await supabaseAdmin
          .from("employee_webauthn_credentials").select("id")
          .eq("employee_id", emp.id).maybeSingle();

        // Punch type
        const { data: lastData } = await supabaseAdmin.rpc("last_punch", { p_employee_id: emp.id });
        const last = lastData?.[0] as { type: string; punched_at: string } | undefined;
        const punchType: "in" | "out" = last?.type === "in" ? "out" : "in";

        return new Response(JSON.stringify({
          employeeId: emp.id,
          name: emp.name,
          role: emp.role,
          punchType,
          lastPunchedAt: last?.type === "in" ? last.punched_at : null,
          deviceFirstBind,
          webauthnRequired: !!webauthnCred,
        }), { headers: { "Content-Type": "application/json" } });
      },
    },
  },
});
