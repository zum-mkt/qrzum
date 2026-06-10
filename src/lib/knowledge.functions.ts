import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const listKnowledge = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ qrId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("qr_knowledge").select("*").eq("qr_id", data.qrId).order("created_at");
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const saveKnowledge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    qrId: z.string().uuid(),
    docs: z.array(z.object({
      title: z.string().min(1),
      content: z.string().min(1),
      source_url: z.string().nullable().optional(),
    })).max(20),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: own } = await supabase.from("qr_links").select("id").eq("id", data.qrId).eq("user_id", userId).maybeSingle();
    if (!own) throw new Error("Not authorized");
    await supabase.from("qr_knowledge").delete().eq("qr_id", data.qrId);
    if (data.docs.length === 0) return { ok: true };
    const rows = data.docs.map(d => ({ qr_id: data.qrId, title: d.title, content: d.content.slice(0, 30000), source_url: d.source_url ?? null }));
    const { error } = await supabase.from("qr_knowledge").insert(rows);
    if (error) throw new Error(error.message);
    return { ok: true };
  });