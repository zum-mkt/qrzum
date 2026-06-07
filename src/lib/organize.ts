import { supabase } from "@/integrations/supabase/client";

export type Folder = { id: string; name: string; color: string; parent_id: string | null };
export type Tag = { id: string; name: string; color: string };

export async function fetchFolders(): Promise<Folder[]> {
  const { data, error } = await (supabase.from("folders") as any)
    .select("id,name,color,parent_id")
    .order("name");
  if (error) throw error;
  return (data ?? []) as Folder[];
}

export async function fetchTags(): Promise<Tag[]> {
  const { data, error } = await (supabase.from("tags") as any)
    .select("id,name,color")
    .order("name");
  if (error) throw error;
  return (data ?? []) as Tag[];
}

export async function createFolder(name: string, color = "#64748b", parent_id: string | null = null) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Não autenticado");
  const { data, error } = await (supabase.from("folders") as any)
    .insert({ user_id: u.user.id, name, color, parent_id })
    .select("id,name,color,parent_id")
    .single();
  if (error) throw error;
  return data as Folder;
}

export async function renameFolder(id: string, name: string) {
  const { error } = await (supabase.from("folders") as any).update({ name }).eq("id", id);
  if (error) throw error;
}

export async function deleteFolder(id: string) {
  const { error } = await (supabase.from("folders") as any).delete().eq("id", id);
  if (error) throw error;
}

export async function getOrCreateTag(name: string, color = "#64748b"): Promise<Tag> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Não autenticado");
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Tag vazia");
  const { data: existing } = await (supabase.from("tags") as any)
    .select("id,name,color")
    .eq("user_id", u.user.id)
    .eq("name", trimmed)
    .maybeSingle();
  if (existing) return existing as Tag;
  const { data, error } = await (supabase.from("tags") as any)
    .insert({ user_id: u.user.id, name: trimmed, color })
    .select("id,name,color")
    .single();
  if (error) throw error;
  return data as Tag;
}

export async function setQrTags(qrId: string, tagIds: string[]) {
  await (supabase.from("qr_link_tags") as any).delete().eq("qr_id", qrId);
  if (tagIds.length === 0) return;
  const rows = tagIds.map((tag_id) => ({ qr_id: qrId, tag_id }));
  const { error } = await (supabase.from("qr_link_tags") as any).insert(rows);
  if (error) throw error;
}

export async function fetchQrTags(qrId: string): Promise<string[]> {
  const { data, error } = await (supabase.from("qr_link_tags") as any)
    .select("tag_id")
    .eq("qr_id", qrId);
  if (error) throw error;
  return (data ?? []).map((r: any) => r.tag_id as string);
}