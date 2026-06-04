import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { COLOR_PRESETS, FRAME_LABELS, type FrameStyle } from "@/lib/qr";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, X } from "lucide-react";

export interface QRStyle {
  color: string;
  bgColor: string;
  frameStyle: FrameStyle;
  logoUrl: string | null;
}

export function defaultStyle(): QRStyle {
  return { color: "#0f172a", bgColor: "#ffffff", frameStyle: "none", logoUrl: null };
}

export function QRStyleFields({
  style, onChange,
}: { style: QRStyle; onChange: (s: QRStyle) => void }) {
  const [uploading, setUploading] = useState(false);
  const set = <K extends keyof QRStyle>(k: K, v: QRStyle[K]) => onChange({ ...style, [k]: v });

  const onLogo = async (file: File | null) => {
    if (!file) return;
    if (file.size > 200 * 1024) {
      toast.error("Logo deve ter no máximo 200KB");
      return;
    }
    setUploading(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Não autenticado");
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${u.user.id}/logos/${Date.now()}_${safe}`;
      const { error } = await supabase.storage.from("qr_files").upload(path, file, { upsert: false });
      if (error) throw error;
      const { data: pub } = supabase.storage.from("qr_files").getPublicUrl(path);
      set("logoUrl", pub.publicUrl);
      toast.success("Logo enviado");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Paletas rápidas</Label>
        <div className="flex flex-wrap gap-2">
          {COLOR_PRESETS.map((p) => (
            <button
              key={p.name}
              type="button"
              onClick={() => onChange({ ...style, color: p.fg, bgColor: p.bg })}
              className="group flex items-center gap-2 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs hover:border-primary"
              title={p.name}
            >
              <span className="flex h-5 w-5 overflow-hidden rounded ring-1 ring-border">
                <span className="h-full w-1/2" style={{ background: p.fg }} />
                <span className="h-full w-1/2" style={{ background: p.bg }} />
              </span>
              {p.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Cor do QR</Label>
          <div className="flex items-center gap-2">
            <input type="color" value={style.color} onChange={(e) => set("color", e.target.value)} className="h-10 w-14 cursor-pointer rounded border border-input bg-background" />
            <Input value={style.color} onChange={(e) => set("color", e.target.value)} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Cor de fundo</Label>
          <div className="flex items-center gap-2">
            <input type="color" value={style.bgColor} onChange={(e) => set("bgColor", e.target.value)} className="h-10 w-14 cursor-pointer rounded border border-input bg-background" />
            <Input value={style.bgColor} onChange={(e) => set("bgColor", e.target.value)} />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Moldura</Label>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(FRAME_LABELS) as FrameStyle[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => set("frameStyle", f)}
              className={`rounded-md border px-3 py-1.5 text-xs transition-colors ${
                style.frameStyle === f
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background hover:border-primary/50"
              }`}
            >
              {FRAME_LABELS[f]}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Logo central (opcional, ≤ 200KB)</Label>
        {style.logoUrl ? (
          <div className="flex items-center gap-3 rounded-md border border-border bg-background p-2">
            <img src={style.logoUrl} alt="Logo" className="h-10 w-10 rounded object-contain ring-1 ring-border" />
            <span className="flex-1 truncate text-xs text-muted-foreground">Logo enviado</span>
            <Button type="button" variant="ghost" size="sm" onClick={() => set("logoUrl", null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-border bg-background p-3 text-sm text-muted-foreground hover:border-primary">
            <Upload className="h-4 w-4" />
            {uploading ? "Enviando..." : "Escolher imagem (PNG/JPG/SVG)"}
            <input
              type="file"
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              className="hidden"
              onChange={(e) => onLogo(e.target.files?.[0] ?? null)}
            />
          </label>
        )}
      </div>
    </div>
  );
}
