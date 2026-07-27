import { createFileRoute } from "@tanstack/react-router";
import { createHash } from "crypto";
import { rateLimit } from "@/lib/rate-limit";

export const Route = createFileRoute("/api/public/verify-password")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const ip = (
          request.headers.get("cf-connecting-ip") ||
          request.headers.get("x-forwarded-for") ||
          "anon"
        ).split(",")[0].trim();

        // 10 attempts per 60s per IP
        if (!rateLimit(`vpw:${ip}`, 10, 60_000)) {
          return new Response("Too many requests", { status: 429 });
        }

        let body: { shortId?: string; password?: string } = {};
        try { body = await request.json(); } catch { /* ignore */ }

        const shortId = (body.shortId ?? "").toString().slice(0, 20);
        const password = (body.password ?? "").toString().slice(0, 200);

        if (!shortId || !password) {
          return new Response("Bad request", { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: link } = await supabaseAdmin
          .from("qr_links")
          .select("password_enabled, password_hash")
          .eq("short_id", shortId)
          .maybeSingle();

        if (!link?.password_enabled || !link.password_hash) {
          return new Response(JSON.stringify({ ok: true }), {
            headers: { "Content-Type": "application/json" },
          });
        }

        const hash = createHash("sha256").update(password).digest("hex");
        const ok = hash === link.password_hash;

        return new Response(JSON.stringify({ ok }), {
          status: ok ? 200 : 401,
          headers: { "Content-Type": "application/json" },
        });
      },
      OPTIONS: async () => new Response(null, { status: 204 }),
    },
  },
});
