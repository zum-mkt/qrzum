import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/scan")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: { short_id?: string; referrer?: string | null } = {};
        try { body = await request.json(); } catch { /* ignore */ }
        const shortId = (body.short_id || "").toString().slice(0, 20);
        if (!shortId || !/^[A-Za-z0-9]+$/.test(shortId)) {
          return new Response("bad request", { status: 400 });
        }

        const ua = request.headers.get("user-agent") || "";
        const country = request.headers.get("cf-ipcountry") || request.headers.get("x-vercel-ip-country");
        const city = request.headers.get("cf-ipcity") || request.headers.get("x-vercel-ip-city");
        const referrer = (body.referrer || request.headers.get("referer") || "").toString().slice(0, 500) || null;

        const device = /Mobi|Android|iPhone/i.test(ua) ? "mobile" : /iPad|Tablet/i.test(ua) ? "tablet" : "desktop";
        let os = "unknown";
        if (/Windows/i.test(ua)) os = "Windows";
        else if (/Android/i.test(ua)) os = "Android";
        else if (/iPhone|iPad|iOS/i.test(ua)) os = "iOS";
        else if (/Mac OS X/i.test(ua)) os = "macOS";
        else if (/Linux/i.test(ua)) os = "Linux";
        let browser = "unknown";
        if (/Edg\//i.test(ua)) browser = "Edge";
        else if (/Chrome\//i.test(ua)) browser = "Chrome";
        else if (/Firefox\//i.test(ua)) browser = "Firefox";
        else if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) browser = "Safari";

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const admin = supabaseAdmin as any;
          const { data: link } = await admin
            .from("qr_links")
            .select("id")
            .eq("short_id", shortId)
            .maybeSingle();
          if (link?.id) {
            await admin.from("qr_scans").insert({
              qr_id: link.id, country, city, device, os, browser, referrer,
            });
          }
        } catch {
          // fire-and-forget; never break the redirect
        }
        return new Response("ok", { status: 200 });
      },
      OPTIONS: async () => new Response(null, { status: 204 }),
    },
  },
});