import { createFileRoute } from "@tanstack/react-router";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";

export const Route = createFileRoute("/api/ponto/webauthn/auth-verify")({
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
          .select("id, challenge").eq("employee_id", body.employeeId).eq("type", "authenticate")
          .gt("expires_at", new Date().toISOString())
          .order("created_at", { ascending: false }).limit(1).maybeSingle();

        if (!challengeRow) {
          return new Response(JSON.stringify({ error: "challenge_expired" }), {
            status: 400, headers: { "Content-Type": "application/json" },
          });
        }

        const credentialId = body.response.id;
        const { data: cred } = await supabaseAdmin
          .from("employee_webauthn_credentials")
          .select("id, credential_id, public_key, sign_count")
          .eq("employee_id", body.employeeId).eq("credential_id", credentialId).maybeSingle();

        if (!cred) {
          return new Response(JSON.stringify({ error: "credential_not_found" }), {
            status: 404, headers: { "Content-Type": "application/json" },
          });
        }

        const hostname = new URL(request.url).hostname;
        const publicKey = Uint8Array.from(atob(cred.public_key), c => c.charCodeAt(0));

        try {
          const { verified, authenticationInfo } = await verifyAuthenticationResponse({
            response: body.response,
            expectedChallenge: challengeRow.challenge,
            expectedOrigin: `https://${hostname}`,
            expectedRPID: hostname,
            credential: {
              id: cred.credential_id,
              publicKey,
              counter: cred.sign_count,
            },
            requireUserVerification: true,
          });

          if (!verified) {
            return new Response(JSON.stringify({ error: "verification_failed" }), {
              status: 401, headers: { "Content-Type": "application/json" },
            });
          }

          await supabaseAdmin.from("ponto_webauthn_challenges").delete().eq("id", challengeRow.id);
          await supabaseAdmin.from("employee_webauthn_credentials")
            .update({ sign_count: authenticationInfo.newCounter }).eq("id", cred.id);

          // Issue punch token (valid 90s)
          const { data: tokenRow } = await supabaseAdmin
            .from("ponto_punch_tokens").insert({ employee_id: body.employeeId }).select("token").single();

          return new Response(JSON.stringify({ ok: true, punchToken: tokenRow?.token }), {
            headers: { "Content-Type": "application/json" },
          });
        } catch (e: any) {
          return new Response(JSON.stringify({ error: e.message }), {
            status: 400, headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
