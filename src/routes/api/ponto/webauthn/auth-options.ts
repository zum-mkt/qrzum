import { createFileRoute } from "@tanstack/react-router";
import { generateAuthenticationOptions } from "@simplewebauthn/server";

export const Route = createFileRoute("/api/ponto/webauthn/auth-options")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: { employeeId?: string };
        try { body = await request.json() as typeof body; }
        catch { return new Response("Bad request", { status: 400 }); }
        if (!body.employeeId) return new Response("Missing employeeId", { status: 400 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: creds } = await supabaseAdmin
          .from("employee_webauthn_credentials").select("credential_id").eq("employee_id", body.employeeId);

        if (!creds?.length) return new Response("No credentials", { status: 404 });

        const hostname = new URL(request.url).hostname;
        const options = await generateAuthenticationOptions({
          rpID: hostname,
          allowCredentials: creds.map(c => ({ id: c.credential_id, type: "public-key" as const })),
          userVerification: "required",
          timeout: 60000,
        });

        await supabaseAdmin.from("ponto_webauthn_challenges").insert({
          employee_id: body.employeeId, challenge: options.challenge, type: "authenticate",
        });

        return new Response(JSON.stringify(options), { headers: { "Content-Type": "application/json" } });
      },
    },
  },
});
