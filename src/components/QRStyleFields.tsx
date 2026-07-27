import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { COLOR_PRESETS, FRAME_LABELS, defaultFrameText, type FrameStyle } from "@/lib/qr";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, X } from "lucide-react";

export type DotStyle = "square" | "dots" | "rounded" | "extra-rounded" | "classy" | "classy-rounded";
export type CornerSquareStyle = "square" | "dot" | "extra-rounded";
export type CornerDotStyle = "square" | "dot";

export interface QRStyle {
  color: string;
  bgColor: string;
  frameStyle: FrameStyle;
  frameText?: string | null;
  logoUrl: string | null;
  dotStyle?: DotStyle;
  cornerSquareStyle?: CornerSquareStyle;
  cornerDotStyle?: CornerDotStyle;
  gradientEnabled?: boolean;
  gradientType?: "linear" | "radial";
  gradientAngle?: number;
  gradientColor2?: string;
}

export function defaultStyle(): QRStyle {
  return {
    color: "#0f172a",
    bgColor: "#ffffff",
    frameStyle: "none",
    frameText: null,
    logoUrl: null,
    dotStyle: "square",
    cornerSquareStyle: "square",
    cornerDotStyle: "square",
    gradientEnabled: false,
    gradientType: "linear",
    gradientAngle: 45,
    gradientColor2: "#6366f1",
  };
}

const DOT_STYLES: { id: DotStyle; label: string; preview: string }[] = [
  { id: "square", label: "Quadrado", preview: "▪▪▪" },
  { id: "dots", label: "Circular", preview: "●●●" },
  { id: "rounded", label: "Arredondado", preview: "▫▫▫" },
  { id: "extra-rounded", label: "Extra", preview: "◉◉◉" },
  { id: "classy", label: "Classy", preview: "◆◆◆" },
  { id: "classy-rounded", label: "Classy+", preview: "◈◈◈" },
];

const CORNER_SQUARE_STYLES: { id: CornerSquareStyle; label: string }[] = [
  { id: "square", label: "Quadrado" },
  { id: "dot", label: "Circular" },
  { id: "extra-rounded", label: "Arredondado" },
];

const CORNER_DOT_STYLES: { id: CornerDotStyle; label: string }[] = [
  { id: "square", label: "Quadrado" },
  { id: "dot", label: "Circular" },
];

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none ${on ? "bg-primary" : "bg-muted-foreground/30"}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${on ? "translate-x-4" : "translate-x-0.5"}`}
      />
    </button>
  );
}

export function QRStyleFields({
  style, onChange,
}: { style: QRStyle; onChange: (s: QRStyle) => void }) {
  const [uploading, setUploading] = useState(false);
  const set = <K extends keyof QRStyle>(k: K, v: QRStyle[K]) => onChange({ ...style, [k]: v });

  const gradEnabled = style.gradientEnabled ?? false;
  const gradType = style.gradientType ?? "linear";
  const gradAngle = style.gradientAngle ?? 45;
  const gradColor2 = style.gradientColor2 ?? "#6366f1";

  const gradPreview =
    gradType === "radial"
      ? `radial-gradient(circle, ${style.color}, ${gradColor2})`
      : `linear-gradient(${gradAngle}deg, ${style.color}, ${gradColor2})`;

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
      {/* Color presets */}
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

      {/* Colors */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>{gradEnabled ? "Cor inicial" : "Cor do QR"}</Label>
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

      {/* Gradient */}
      <div className="space-y-3 rounded-md border border-border bg-background p-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Degradê nos pontos</Label>
          <Toggle on={gradEnabled} onToggle={() => set("gradientEnabled", !gradEnabled)} />
        </div>

        {gradEnabled && (
          <div className="space-y-3">
            {/* Preview strip */}
            <div
              className="h-8 w-full rounded-md shadow-inner"
              style={{ background: gradPreview }}
            />

            {/* Type */}
            <div className="flex gap-2">
              {(["linear", "radial"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => set("gradientType", t)}
                  className={`flex-1 rounded-md border px-3 py-1.5 text-xs transition-colors ${
                    gradType === t ? "border-primary bg-primary/10 text-primary" : "border-border bg-background hover:border-primary/50"
                  }`}
                >
                  {t === "linear" ? "Linear" : "Radial"}
                </button>
              ))}
            </div>

            {/* Second color */}
            <div className="space-y-1">
              <Label className="text-xs">Cor final</Label>
              <div className="flex items-center gap-2">
                <input type="color" value={gradColor2} onChange={(e) => set("gradientColor2", e.target.value)} className="h-9 w-12 cursor-pointer rounded border border-input bg-background" />
                <Input value={gradColor2} onChange={(e) => set("gradientColor2", e.target.value)} className="h-9 text-sm" />
              </div>
            </div>

            {/* Angle (linear only) */}
            {gradType === "linear" && (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Ângulo</Label>
                  <span className="text-xs tabular-nums text-muted-foreground">{gradAngle}°</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={360}
                  value={gradAngle}
                  onChange={(e) => set("gradientAngle", Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dot style */}
      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Estilo dos pontos</Label>
        <div className="flex flex-wrap gap-1.5">
          {DOT_STYLES.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => set("dotStyle", d.id)}
              className={`flex flex-col items-center gap-0.5 rounded-md border px-2.5 py-1.5 text-[10px] font-medium transition-colors ${
                (style.dotStyle ?? "square") === d.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background hover:border-primary/50"
              }`}
            >
              <span className="text-[11px] tracking-widest">{d.preview}</span>
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* Corner styles */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Cantos externos</Label>
          <div className="flex gap-1.5">
            {CORNER_SQUARE_STYLES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => set("cornerSquareStyle", c.id)}
                className={`flex-1 rounded-md border px-2 py-1.5 text-xs transition-colors ${
                  (style.cornerSquareStyle ?? "square") === c.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background hover:border-primary/50"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Cantos internos</Label>
          <div className="flex gap-1.5">
            {CORNER_DOT_STYLES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => set("cornerDotStyle", c.id)}
                className={`flex-1 rounded-md border px-2 py-1.5 text-xs transition-colors ${
                  (style.cornerDotStyle ?? "square") === c.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background hover:border-primary/50"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Frame */}
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
        {style.frameStyle !== "none" && (
          <div className="pt-2">
            <Label className="text-xs text-muted-foreground">Texto do CTA (opcional)</Label>
            <Input
              value={style.frameText ?? ""}
              placeholder={defaultFrameText(style.frameStyle)}
              onChange={(e) => set("frameText", e.target.value || null)}
              maxLength={28}
            />
          </div>
        )}
      </div>

      {/* Logo */}
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
