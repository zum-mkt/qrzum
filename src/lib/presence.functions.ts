import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { getEnvVar } from "@/lib/cloudflare-context";

async function hmac(message: string): Promise<string> {
  const secret = getEnvVar("SUPABASE_SERVICE_ROLE_KEY") ?? "fallback-secret";
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode("presence-v1:" + secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

async function sha256Hex(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
}

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export const mintPresenceProof = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({
    shortId: z.string(),
    lat: z.number(),
    lng: z.number(),
    accuracy_m: z.number(),
    device_fp: z.string(),
    nonce: z.string().min(8),
  }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: link } = await supabaseAdmin.from("qr_links")
      .select("id, proof_enabled, proof_anchor").eq("short_id", data.shortId).maybeSingle();
    if (!link || !link.proof_enabled) throw new Error("Proof not enabled");
    const anchor = link.proof_anchor as { lat: number; lng: number; radius_m: number } | null;
    if (!anchor) throw new Error("Proof anchor not configured");
    if (data.accuracy_m > 100) throw new Error("Localização imprecisa (>100m)");
    const dist = haversineMeters(data.lat, data.lng, anchor.lat, anchor.lng);
    if (dist > anchor.radius_m) throw new Error("Fora do perímetro");

    const scanned_at = new Date().toISOString();
    const payload = JSON.stringify({
      qr_id: link.id, lat: data.lat, lng: data.lng,
      accuracy_m: data.accuracy_m, device_fp: data.device_fp,
      nonce: data.nonce, scanned_at,
    });
    const payload_hash = await sha256Hex(payload);
    const signature = await hmac(payload_hash);

    const { data: inserted, error } = await supabaseAdmin.from("presence_proofs").insert({
      qr_id: link.id, lat: data.lat, lng: data.lng,
      accuracy_m: data.accuracy_m, device_fp: data.device_fp,
      nonce: data.nonce, signature, payload_hash, scanned_at,
    }).select("id").single();
    if (error) throw new Error(error.message);
    return { id: inserted.id, signature, payload_hash };
  });

export const verifyPresenceProof = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: p } = await supabaseAdmin.from("presence_proofs").select("*").eq("id", data.id).maybeSingle();
    if (!p) return { valid: false };
    const payload = JSON.stringify({
      qr_id: p.qr_id, lat: p.lat, lng: p.lng,
      accuracy_m: p.accuracy_m, device_fp: p.device_fp,
      nonce: p.nonce, scanned_at: p.scanned_at,
    });
    const recomputedHash = await sha256Hex(payload);
    if (recomputedHash !== p.payload_hash) return { valid: false };
    const recomputedSig = await hmac(recomputedHash);
    return { valid: recomputedSig === p.signature, proof: p };
  });

export const listMyPresenceProofs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("presence_proofs")
      .select("id, qr_id, scanned_at, lat, lng, accuracy_m, nonce, qr_links!inner(title, short_id)")
      .order("scanned_at", { ascending: false }).limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const setProofConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    qrId: z.string().uuid(),
    enabled: z.boolean(),
    anchor: z.object({ lat: z.number(), lng: z.number(), radius_m: z.number(), label: z.string().optional() }).nullable(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("qr_links")
      .update({ proof_enabled: data.enabled, proof_anchor: data.anchor })
      .eq("id", data.qrId).eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });