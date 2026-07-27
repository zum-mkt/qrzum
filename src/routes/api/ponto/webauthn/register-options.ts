import { createFileRoute } from "@tanstack/react-router";
import { generateRegistrationOptions } from "@simplewebauthn/server";

export const Route = createFileRoute("/api/ponto/webauthn/register-options")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: { employeeId?: string };
        try { body = await request.json() as typeof body; }
        catch { return new Response("Bad request", { status: 400 }); }
        if (!body.employeeId) return new Response("Missing employeeId", { status: 400 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: emp } = await supabaseAdmin
          .from("employees").select("id, name").eq("id", body.employeeId).maybeSingle();
        if (!emp) return new Response("Employee not found", { status: 404 });

        const { data: existing } = await supabaseAdmin
          .from("employee_webauthn_credentials").select("credential_id").eq("employee_id", emp.id);

        const hostname = new URL(request.url).hostname;

        const options = await generateRegistrationOptions({
          rpName: "QRzum · Registro de Ponto",
          rpID: hostname,
          userID: new TextEncoder().encode(emp.id),
          userName: emp.name,
          userDisplayName: emp.name,
          attestationType: "none",
          authenticatorSelection: {
            residentKey: "discouraged",
            userVerification: "required",
            authenticatorAttachment: "platform",
          },
          excludeCredentials: (existing ?? []).map(c => ({ id: c.credential_id, type: "public-key" as const })),
          timeout: 60000,
        });

        await supabaseAdmin.from("ponto_webauthn_challenges").insert({
          employee_id: emp.id, challenge: options.challenge, type: "register",
        });

        return new Response(JSON.stringify(options), { headers: { "Content-Type": "application/json" } });
      },
    },
  },
});
