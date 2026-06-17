import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import type { FlowDefinition } from "./flow";

// ─── Public: load flow for the runner ────────────────────────────────────────

export const getFlowForRunner = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ shortId: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: link } = await supabaseAdmin
      .from("qr_links")
      .select("id, title, active, type, short_id")
      .eq("short_id", data.shortId)
      .maybeSingle();
    if (!link || link.type !== "flow") return null;
    if (!link.active) return null;
    const { data: flow } = await supabaseAdmin
      .from("qr_flows")
      .select("definition")
      .eq("qr_id", link.id)
      .maybeSingle();
    return {
      qrId: link.id as string,
      title: link.title as string,
      definition: (flow?.definition ?? { blocks: [], notifications: [] }) as FlowDefinition,
    };
  });

// ─── Authenticated: load flow for the builder ────────────────────────────────

export const getFlowForBuilder = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ qrId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: own } = await supabase
      .from("qr_links")
      .select("id, title")
      .eq("id", data.qrId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!own) throw new Error("Not authorized");
    const { data: flow } = await supabase
      .from("qr_flows")
      .select("definition")
      .eq("qr_id", data.qrId)
      .maybeSingle();
    return {
      title: own.title as string,
      definition: (flow?.definition ?? { blocks: [], notifications: [] }) as FlowDefinition,
    };
  });

// ─── Authenticated: save flow ─────────────────────────────────────────────────

export const saveFlowDefinition = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ qrId: z.string().uuid(), definition: z.record(z.any()) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: own } = await supabase
      .from("qr_links")
      .select("id")
      .eq("id", data.qrId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!own) throw new Error("Not authorized");
    const { error } = await (supabase.from("qr_flows") as any).upsert(
      { qr_id: data.qrId, definition: data.definition, updated_at: new Date().toISOString() },
      { onConflict: "qr_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ─── Authenticated: list submissions ─────────────────────────────────────────

export const listSubmissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ qrId: z.string().uuid().optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    let q = supabase
      .from("flow_submissions")
      .select("id, qr_id, answers, submitted_at, lat, lng, device_fp, qr_links!inner(title, short_id, user_id)")
      .order("submitted_at", { ascending: false })
      .limit(500);
    if (data.qrId) q = q.eq("qr_id", data.qrId) as typeof q;
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return (rows ?? []) as Array<{
      id: string;
      qr_id: string;
      answers: Record<string, unknown>;
      submitted_at: string;
      lat: number | null;
      lng: number | null;
      device_fp: string | null;
      qr_links: { title: string; short_id: string; user_id: string };
    }>;
  });

// ─── Authenticated: get webhooks for a QR ────────────────────────────────────

export const listWebhooks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ qrId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: own } = await supabase.from("qr_links").select("id").eq("id", data.qrId).eq("user_id", userId).maybeSingle();
    if (!own) throw new Error("Not authorized");
    const { data: rows, error } = await supabase.from("qr_webhooks").select("*").eq("qr_id", data.qrId);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const saveWebhooks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      qrId: z.string().uuid(),
      webhooks: z.array(z.object({
        id: z.string().uuid().optional(),
        url: z.string().url(),
        trigger_on: z.array(z.enum(["scan", "submit"])),
        enabled: z.boolean(),
      })),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: own } = await supabase.from("qr_links").select("id").eq("id", data.qrId).eq("user_id", userId).maybeSingle();
    if (!own) throw new Error("Not authorized");
    await supabase.from("qr_webhooks").delete().eq("qr_id", data.qrId);
    if (data.webhooks.length === 0) return { ok: true };
    const rows = data.webhooks.map((w) => ({ qr_id: data.qrId, url: w.url, trigger_on: w.trigger_on, enabled: w.enabled }));
    const { error } = await (supabase.from("qr_webhooks") as any).insert(rows);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
