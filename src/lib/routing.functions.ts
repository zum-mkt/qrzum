import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const RuleSchema = z.object({
  id: z.string().uuid().optional(),
  priority: z.number().int(),
  kind: z.enum(["identity", "schedule", "geofence"]),
  config: z.record(z.string(), z.any()),
  action: z.enum(["redirect", "block"]),
  destination_url: z.string().nullable().optional(),
  enabled: z.boolean(),
});

export const listRoutingRules = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ qrId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("qr_routing_rules").select("*").eq("qr_id", data.qrId).order("priority");
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const saveRoutingRules = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    qrId: z.string().uuid(),
    rules: z.array(RuleSchema),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // verify ownership
    const { data: own } = await supabase.from("qr_links").select("id").eq("id", data.qrId).eq("user_id", userId).maybeSingle();
    if (!own) throw new Error("Not authorized");
    await supabase.from("qr_routing_rules").delete().eq("qr_id", data.qrId);
    if (data.rules.length === 0) return { ok: true };
    const rows = data.rules.map((r, i) => ({
      qr_id: data.qrId, priority: i, kind: r.kind, config: r.config,
      action: r.action, destination_url: r.destination_url ?? null, enabled: r.enabled,
    }));
    const { error } = await supabase.from("qr_routing_rules").insert(rows);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Public resolver (no auth middleware) — called from /r/$shortId
export const resolveRoutingForShort = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({
    shortId: z.string(),
    lat: z.number().nullable(),
    lng: z.number().nullable(),
    nowIso: z.string(),
  }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: link } = await supabaseAdmin.from("qr_links")
      .select("id, user_id, destination_url, type").eq("short_id", data.shortId).maybeSingle();
    if (!link) return { action: "redirect" as const, destination_url: null, qrId: null };
    const { data: rules } = await supabaseAdmin.from("qr_routing_rules")
      .select("*").eq("qr_id", link.id).eq("enabled", true).order("priority");

    // Identity: fetch caller user via Authorization header injected by auth attacher
    // For public anon callers we assume no role.
    const now = new Date(data.nowIso);
    for (const r of rules ?? []) {
      if (r.kind === "schedule") {
        const cfg = r.config as { tz?: string; days: number[]; start: string; end: string };
        const day = now.getUTCDay();
        if (cfg.days && !cfg.days.includes(day)) continue;
        const [sH, sM] = (cfg.start || "00:00").split(":").map(Number);
        const [eH, eM] = (cfg.end || "23:59").split(":").map(Number);
        const m = now.getUTCHours() * 60 + now.getUTCMinutes();
        if (m < sH * 60 + sM || m > eH * 60 + eM) continue;
      } else if (r.kind === "geofence") {
        const cfg = r.config as { lat: number; lng: number; radius_m: number; mode: "allow" | "block" };
        if (data.lat == null || data.lng == null) continue;
        const dist = haversineMeters(data.lat, data.lng, cfg.lat, cfg.lng);
        const inside = dist <= cfg.radius_m;
        if (cfg.mode === "allow" && !inside) continue;
        if (cfg.mode === "block" && !inside) continue;
      } else if (r.kind === "identity") {
        // identity rules need an authenticated caller; skip for anon
        continue;
      }
      return { action: r.action as "redirect" | "block", destination_url: r.destination_url, qrId: link.id };
    }
    return { action: "redirect" as const, destination_url: null, qrId: link.id };
  });

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}