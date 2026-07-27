import { createFileRoute } from "@tanstack/react-router";
import { verifyRegistrationResponse } from "@simplewebauthn/server";

export const Route = createFileRoute("/api/ponto/webauthn/register-verify")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: { employeeId?: string; response?: any };
        try { body = await request.json() as typeof body; }
        catch { return new Response("Bad request", { status: 400 }); }
        if (!body.employeeId || !body.response) return new Response("Missing fields", { status: 400 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: challengeRow } = await supabaseAdmin
          .from("ponto_webauthn_challenges")
          .select("id, challenge").eq("employee_id", body.employeeId).eq("type", "register")
          .gt("expires_at", new Date().toISOString())
          .order("created_at", { ascending: false }).limit(1).maybeSingle();

        if (!challengeRow) {
          return new Response(JSON.stringify({ error: "challenge_expired" }), {
            status: 400, headers: { "Content-Type": "application/json" },
          });
        }

        const hostname = new URL(request.url).hostname;
        try {
          const { verified, registrationInfo } = await verifyRegistrationResponse({
            response: body.response,
            expectedChallenge: challengeRow.challenge,
            expectedOrigin: `https://${hostname}`,
            expectedRPID: hostname,
            requireUserVerification: true,
          });

          if (!verified || !registrationInfo) {
            return new Response(JSON.stringify({ error: "verification_failed" }), {
              status: 400, headers: { "Content-Type": "application/json" },
            });
          }

          await supabaseAdmin.from("ponto_webauthn_challenges").delete().eq("id", challengeRow.id);

          const { credential } = registrationInfo;
          const publicKeyB64 = btoa(String.fromCharCode(...credential.publicKey));
          await supabaseAdmin.from("employee_webauthn_credentials").insert({
            employee_id: body.employeeId,
            credential_id: credential.id,
            public_key: publicKeyB64,
            sign_count: credential.counter,
          });

          return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
        } catch (e: any) {
          return new Response(JSON.stringify({ error: e.message }), {
            status: 400, headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
