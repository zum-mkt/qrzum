import { createFileRoute } from "@tanstack/react-router";
import { rateLimit } from "@/lib/rate-limit";

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const Route = createFileRoute("/api/ponto/punch")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const ip = (
          request.headers.get("CF-Connecting-IP") ||
          request.headers.get("X-Forwarded-For") ||
          "anon"
        ).split(",")[0].trim();

        // 10 punch attempts per 60s per IP
        if (!rateLimit(`punch:${ip}`, 10, 60_000)) {
          return new Response(JSON.stringify({ error: "rate_limited" }), {
            status: 429, headers: { "Content-Type": "application/json" },
          });
        }

        let body: {
          employeeId?: string;
          qrId?: string;
          type?: "in" | "out";
          lat?: number | null;
          lng?: number | null;
          accuracy?: number | null;
          deviceId?: string | null;
          punchToken?: string | null;
        };
        try { body = await request.json() as typeof body; }
        catch { return new Response("Bad request", { status: 400 }); }

        if (!body.employeeId || !body.qrId || !body.type) {
          return new Response("Missing required fields", { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Get QR + geo config
        const { data: qr } = await supabaseAdmin
          .from("qr_links")
          .select("user_id, geo_lat, geo_lng, geo_radius")
          .eq("id", body.qrId).eq("type", "ponto").maybeSingle();

        if (!qr) return new Response("QR not found", { status: 404 });

        // Layer 1 — Geofence (server re-validation)
        if (qr.geo_lat != null && qr.geo_lng != null && qr.geo_radius != null) {
          if (body.lat == null || body.lng == null) {
            return new Response(JSON.stringify({ error: "geo_required" }), {
              status: 403, headers: { "Content-Type": "application/json" },
            });
          }
          const dist = Math.round(haversine(qr.geo_lat, qr.geo_lng, body.lat, body.lng));
          if (dist > qr.geo_radius) {
            return new Response(JSON.stringify({ error: "geo_blocked", distance: dist, radius: qr.geo_radius }), {
              status: 403, headers: { "Content-Type": "application/json" },
            });
          }
        }

        // Get employee
        const { data: emp } = await supabaseAdmin
          .from("employees").select("id, device_id")
          .eq("id", body.employeeId).eq("user_id", qr.user_id).eq("active", true).maybeSingle();

        if (!emp) return new Response("Employee not found", { status: 404 });

        // Layer 2 — Device binding: block if bound device doesn't match (null deviceId = no match)
        if (emp.device_id && emp.device_id !== (body.deviceId ?? "")) {
          return new Response(JSON.stringify({ error: "device_unauthorized" }), {
            status: 403, headers: { "Content-Type": "application/json" },
          });
        }

        // Layer 3 — WebAuthn punch token
        const { data: webauthnCred } = await supabaseAdmin
          .from("employee_webauthn_credentials").select("id")
          .eq("employee_id", body.employeeId).maybeSingle();

        if (webauthnCred) {
          if (!body.punchToken) {
            return new Response(JSON.stringify({ error: "webauthn_required" }), {
              status: 403, headers: { "Content-Type": "application/json" },
            });
          }
          const { data: tokenRow } = await supabaseAdmin
            .from("ponto_punch_tokens").select("id, expires_at, used")
            .eq("token", body.punchToken).eq("employee_id", body.employeeId).maybeSingle();

          if (!tokenRow || tokenRow.used || new Date(tokenRow.expires_at) < new Date()) {
            return new Response(JSON.stringify({ error: "invalid_token" }), {
              status: 403, headers: { "Content-Type": "application/json" },
            });
          }
          await supabaseAdmin.from("ponto_punch_tokens").update({ used: true }).eq("id", tokenRow.id);
        }

        const clientIp = request.headers.get("CF-Connecting-IP") ??
          request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ?? null;

        const { error } = await supabaseAdmin.from("time_punches").insert({
          employee_id: body.employeeId,
          qr_id: body.qrId,
          type: body.type,
          lat: body.lat ?? null,
          lng: body.lng ?? null,
          accuracy: body.accuracy ?? null,
          ip: clientIp,
        });

        if (error) return new Response(error.message, { status: 500 });

        return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
      },
    },
  },
});
