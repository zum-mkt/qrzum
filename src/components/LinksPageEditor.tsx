import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Upload, X } from "lucide-react";
import {
  defaultLinksTheme, type LinkItem, type LinksData, type LinksTheme,
  type LinksBackground, type LinksTextureId, type LinksButtonRadius,
} from "@/lib/qr";
import { LinkIconPickerField } from "@/components/LinkIconPicker";
import { LinksPageView } from "@/components/LinksPageView";

const TEXTURES: { id: LinksTextureId; label: string }[] = [
  { id: "dots", label: "Pontos" },
  { id: "grid", label: "Grade" },
  { id: "diagonal", label: "Diagonal" },
  { id: "waves", label: "Ondas" },
];

const RADII: { id: LinksButtonRadius; label: string }[] = [
  { id: "sm", label: "Sutil" },
  { id: "md", label: "Padrão" },
  { id: "lg", label: "Arredondado" },
  { id: "full", label: "Pill" },
];

function backgroundDefaultsFor(type: "solid" | "gradient" | "texture", current: LinksBackground): LinksBackground {
  if (type === current.type) return current;
  const color2 = "color2" in current ? current.color2 : "#e5e7eb";
  if (type === "solid") return { type: "solid", color1: current.color1 };
  if (type === "gradient") return { type: "gradient", color1: current.color1, color2, angle: "angle" in current ? current.angle : 135 };
  return { type: "texture", textureId: "dots", color1: current.color1, color2 };
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-2">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-9 w-12 cursor-pointer rounded border border-input bg-background" />
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="h-9 text-sm" />
      </div>
    </div>
  );
}

function ImageUploadField({
  label, value, uploading, onUpload, onClear,
}: { label: string; value?: string | null; uploading: boolean; onUpload: (f: File | null) => void; onClear: () => void }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs">{label}</Label>
      {value ? (
        <div className="flex items-center gap-2 rounded-md border border-border bg-background p-2">
          <img src={value} alt="" className="h-10 w-10 rounded object-cover ring-1 ring-border" />
          <span className="flex-1 truncate text-xs text-muted-foreground">Imagem enviada</span>
          <Button type="button" variant="ghost" size="sm" onClick={onClear}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-border bg-background p-3 text-xs text-muted-foreground hover:border-primary">
          <Upload className="h-3.5 w-3.5" />
          {uploading ? "Enviando..." : "Escolher imagem"}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => onUpload(e.target.files?.[0] ?? null)}
          />
        </label>
      )}
    </div>
  );
}

export function LinksPageEditor({ qrId }: { qrId: string }) {
  const qc = useQueryClient();
  const { data: row, isLoading } = useQuery({
    queryKey: ["links-page", qrId],
    queryFn: async () => {
      const { data, error } = await supabase.from("qr_links").select("title, vcard_data").eq("id", qrId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [section, setSection] = useState<"content" | "appearance">("content");
  const [bio, setBio] = useState<string | null>(null);
  const [items, setItems] = useState<LinkItem[] | null>(null);
  const [theme, setTheme] = useState<LinksTheme | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"header" | "avatar" | null>(null);

  const original = (row?.vcard_data ?? {}) as LinksData;
  const effectiveBio = bio ?? original.bio ?? "";
  const effectiveItems = items ?? original.items ?? [];
  const effectiveTheme = theme ?? original.theme ?? defaultLinksTheme();

  const patchTheme = (patch: Partial<LinksTheme>) => setTheme({ ...effectiveTheme, ...patch });
  const patchBackground = (patch: Partial<LinksBackground>) =>
    patchTheme({ background: { ...effectiveTheme.background, ...patch } as LinksBackground });

  const updateItem = (i: number, patch: Partial<LinkItem>) =>
    setItems(effectiveItems.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const addItem = () => setItems([...effectiveItems, { label: "", url: "" }]);
  const removeItem = (i: number) => setItems(effectiveItems.filter((_, idx) => idx !== i));

  const upload = async (file: File | null, kind: "header" | "avatar") => {
    if (!file) return;
    const maxSize = kind === "header" ? 2 * 1024 * 1024 : 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(`Imagem deve ter no máximo ${maxSize / (1024 * 1024)}MB`);
      return;
    }
    setUploading(kind);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Não autenticado");
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${u.user.id}/${kind}/${Date.now()}_${safe}`;
      const { error } = await supabase.storage.from("links_assets").upload(path, file, { upsert: false });
      if (error) throw error;
      const { data: pub } = supabase.storage.from("links_assets").getPublicUrl(path);
      patchTheme(kind === "header" ? { headerImageUrl: pub.publicUrl } : { avatarUrl: pub.publicUrl });
      toast.success("Imagem enviada");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploading(null);
    }
  };

  const save = async () => {
    const cleaned = effectiveItems.filter((it) => it.label.trim() && it.url.trim());
    setSaving(true);
    try {
      const payload: LinksData = { bio: effectiveBio || undefined, items: cleaned, theme: effectiveTheme };
      const { error } = await supabase.from("qr_links").update({ vcard_data: payload } as any).eq("id", qrId);
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["links-page", qrId] });
      setBio(null);
      setItems(null);
      setTheme(null);
      toast.success("Página salva");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <p className="py-4 text-sm text-muted-foreground">Carregando…</p>;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
      <div className="space-y-4">
        <div className="flex gap-2">
          <Button type="button" size="sm" variant={section === "content" ? "default" : "outline"} onClick={() => setSection("content")}>
            Conteúdo
          </Button>
          <Button type="button" size="sm" variant={section === "appearance" ? "default" : "outline"} onClick={() => setSection("appearance")}>
            Aparência
          </Button>
        </div>

        {section === "content" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Bio (opcional)</Label>
              <Textarea value={effectiveBio} onChange={(e) => setBio(e.target.value)} rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Links</Label>
              {effectiveItems.map((it, i) => (
                <div key={i} className="space-y-2 rounded-md border border-border p-2">
                  <div className="flex gap-2">
                    <Input placeholder="Texto do botão" value={it.label} onChange={(e) => updateItem(i, { label: e.target.value })} />
                    <Input placeholder="https://..." value={it.url} onChange={(e) => updateItem(i, { url: e.target.value })} />
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(i)} disabled={effectiveItems.length === 1}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <LinkIconPickerField value={it.icon} url={it.url} onChange={(icon) => updateItem(i, { icon })} />
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="mr-1 h-4 w-4" /> Adicionar link
              </Button>
            </div>
          </div>
        )}

        {section === "appearance" && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <ImageUploadField
                label="Imagem de cabeçalho"
                value={effectiveTheme.headerImageUrl}
                uploading={uploading === "header"}
                onUpload={(f) => upload(f, "header")}
                onClear={() => patchTheme({ headerImageUrl: null })}
              />
              <ImageUploadField
                label="Avatar"
                value={effectiveTheme.avatarUrl}
                uploading={uploading === "avatar"}
                onUpload={(f) => upload(f, "avatar")}
                onClear={() => patchTheme({ avatarUrl: null })}
              />
            </div>

            <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Fundo</Label>
              <div className="flex gap-2">
                {(["solid", "gradient", "texture"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => patchTheme({ background: backgroundDefaultsFor(t, effectiveTheme.background) })}
                    className={`flex-1 rounded-md border px-3 py-1.5 text-xs transition-colors ${
                      effectiveTheme.background.type === t ? "border-primary bg-primary/10 text-primary" : "border-border bg-background hover:border-primary/50"
                    }`}
                  >
                    {t === "solid" ? "Cor sólida" : t === "gradient" ? "Degradê" : "Textura"}
                  </button>
                ))}
              </div>

              {effectiveTheme.background.type === "solid" && (
                <ColorField label="Cor de fundo" value={effectiveTheme.background.color1} onChange={(v) => patchBackground({ color1: v })} />
              )}

              {effectiveTheme.background.type === "gradient" && (
                <div className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <ColorField label="Cor inicial" value={effectiveTheme.background.color1} onChange={(v) => patchBackground({ color1: v })} />
                    <ColorField label="Cor final" value={effectiveTheme.background.color2} onChange={(v) => patchBackground({ color2: v })} />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Ângulo</Label>
                      <span className="text-xs tabular-nums text-muted-foreground">{effectiveTheme.background.angle}°</span>
                    </div>
                    <input
                      type="range" min={0} max={360}
                      value={effectiveTheme.background.angle}
                      onChange={(e) => patchBackground({ angle: Number(e.target.value) })}
                      className="w-full accent-primary"
                    />
                  </div>
                </div>
              )}

              {effectiveTheme.background.type === "texture" && (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-1.5">
                    {TEXTURES.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => patchBackground({ textureId: t.id })}
                        className={`rounded-md border px-2.5 py-1.5 text-xs transition-colors ${
                          effectiveTheme.background.type === "texture" && effectiveTheme.background.textureId === t.id
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-background hover:border-primary/50"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <ColorField label="Cor de base" value={effectiveTheme.background.color1} onChange={(v) => patchBackground({ color1: v })} />
                    <ColorField label="Cor do padrão" value={effectiveTheme.background.color2} onChange={(v) => patchBackground({ color2: v })} />
                  </div>
                </div>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <ColorField label="Cor do título" value={effectiveTheme.titleColor} onChange={(v) => patchTheme({ titleColor: v })} />
              <ColorField label="Cor da bio" value={effectiveTheme.bioColor} onChange={(v) => patchTheme({ bioColor: v })} />
              <ColorField label="Fundo do botão" value={effectiveTheme.buttonBgColor} onChange={(v) => patchTheme({ buttonBgColor: v })} />
              <ColorField label="Texto do botão" value={effectiveTheme.buttonTextColor} onChange={(v) => patchTheme({ buttonTextColor: v })} />
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Formato dos botões</Label>
              <div className="flex flex-wrap gap-1.5">
                {RADII.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => patchTheme({ buttonRadius: r.id })}
                    className={`rounded-md border px-2.5 py-1.5 text-xs transition-colors ${
                      effectiveTheme.buttonRadius === r.id ? "border-primary bg-primary/10 text-primary" : "border-border bg-background hover:border-primary/50"
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-lg border border-border p-3">
              <Switch checked={effectiveTheme.effectsEnabled} onCheckedChange={(v) => patchTheme({ effectsEnabled: v })} />
              <div>
                <p className="text-sm font-medium">Efeitos de entrada e parallax</p>
                <p className="text-xs text-muted-foreground">Fade-in suave nos elementos e leve parallax na imagem de cabeçalho.</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <Button type="button" size="sm" onClick={save} disabled={saving}>
            {saving ? "Salvando…" : "Salvar página"}
          </Button>
        </div>
      </div>

      <div className="lg:sticky lg:top-4 lg:self-start">
        <Label className="mb-2 block text-xs uppercase tracking-wide text-muted-foreground">Pré-visualização</Label>
        <div className="overflow-hidden rounded-2xl border border-border">
          <div className="max-h-[480px] overflow-y-auto">
            <LinksPageView title={row?.title ?? ""} bio={effectiveBio} items={effectiveItems} theme={effectiveTheme} />
          </div>
        </div>
      </div>
    </div>
  );
}
