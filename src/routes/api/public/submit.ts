import { createFileRoute } from "@tanstack/react-router";
import { rateLimit } from "@/lib/rate-limit";

export const Route = createFileRoute("/api/public/submit")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const ip = (
          request.headers.get("cf-connecting-ip") ||
          request.headers.get("x-forwarded-for") ||
          "anon"
        ).split(",")[0].trim();

        // 30 submissions per 60s per IP
        if (!rateLimit(`submit:${ip}`, 30, 60_000)) {
          return new Response("Too many requests", { status: 429 });
        }

        let body: {
          qr_id?: string;
          answers?: Record<string, unknown>;
          lat?: number | null;
          lng?: number | null;
          device_fp?: string | null;
        } = {};
        try { body = await request.json(); } catch { /* ignore */ }

        const qrId = (body.qr_id || "").toString().trim();
        if (!qrId || !/^[0-9a-f-]{36}$/i.test(qrId)) {
          return new Response("bad request", { status: 400 });
        }

        const ua = request.headers.get("user-agent") || null;
        const lat = typeof body.lat === "number" ? body.lat : null;
        const lng = typeof body.lng === "number" ? body.lng : null;
        const device_fp = body.device_fp ? String(body.device_fp).slice(0, 64) : null;

        // Enforce answers payload size limit
        const answersStr = JSON.stringify(body.answers ?? {});
        if (answersStr.length > 50_000) return new Response("payload too large", { status: 413 });
        const answers = body.answers ?? {};

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const admin = supabaseAdmin as any;

          // Verify QR is active
          const { data: link } = await admin
            .from("qr_links")
            .select("id, active")
            .eq("id", qrId)
            .maybeSingle();
          if (!link?.active) return new Response("not found", { status: 404 });

          // Save submission
          await admin.from("flow_submissions").insert({
            qr_id: qrId, answers, lat, lng, device_fp, user_agent: ua,
          });

          // Fire webhooks triggered on "submit"
          const { data: hooks } = await admin
            .from("qr_webhooks")
            .select("url")
            .eq("qr_id", qrId)
            .eq("enabled", true)
            .contains("trigger_on", ["submit"]);

          if (hooks && hooks.length > 0) {
            const payload = JSON.stringify({
              event: "submit",
              qr_id: qrId,
              submitted_at: new Date().toISOString(),
              answers,
              lat,
              lng,
            });
            await Promise.allSettled(
              hooks
                .filter((h: { url: string }) => h.url.startsWith("https://"))
                .map((h: { url: string }) =>
                  fetch(h.url, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: payload,
                    signal: AbortSignal.timeout(5000),
                  }).catch(() => {}),
                ),
            );
          }
        } catch {
          return new Response("error", { status: 500 });
        }

        return new Response("ok", { status: 200 });
      },
      OPTIONS: async () => new Response(null, { status: 204 }),
    },
  },
});
