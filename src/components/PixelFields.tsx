import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, BarChart3 } from "lucide-react";
import { PIXEL_PATTERNS, type PixelConfig } from "@/lib/qr";

interface Props {
  pixels: PixelConfig;
  onChange: (p: PixelConfig) => void;
  /** Show "Add UTM" switch (only useful for URL-type QRs). */
  showUtm?: boolean;
  defaultOpen?: boolean;
}

export function PixelFields({ pixels, onChange, showUtm = true, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const set = <K extends keyof PixelConfig>(k: K, v: PixelConfig[K]) => onChange({ ...pixels, [k]: v });
  const configured = (Object.keys(PIXEL_PATTERNS) as (keyof typeof PIXEL_PATTERNS)[])
    .filter((k) => !!pixels[k]).length;

  return (
    <div className="rounded-lg border border-border bg-muted/30">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 p-4 text-left"
      >
        <div className="flex items-center gap-2 text-sm font-medium">
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
          Tracking & Pixels
          {configured > 0 && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
              {configured} ativo{configured > 1 ? "s" : ""}
            </span>
          )}
        </div>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {open && (
        <div className="space-y-3 border-t border-border p-4">
          <p className="text-xs text-muted-foreground">
            IDs públicos dos pixels que devem disparar quando alguém escanear este QR. Deixe em branco para não rastrear.
          </p>
          {(Object.keys(PIXEL_PATTERNS) as (keyof typeof PIXEL_PATTERNS)[]).map((k) => {
            const meta = PIXEL_PATTERNS[k];
            const val = (pixels[k] ?? "") as string;
            const valid = !val || meta.regex.test(val);
            return (
              <div key={k} className="space-y-1">
                <Label className="text-xs">{meta.label}</Label>
                <Input
                  value={val}
                  onChange={(e) => set(k, e.target.value || null)}
                  placeholder={meta.placeholder}
                  className={valid ? "" : "border-destructive"}
                />
                {!valid && (
                  <p className="text-xs text-destructive">Formato esperado: {meta.placeholder}</p>
                )}
              </div>
            );
          })}
          {showUtm && (
            <div className="flex items-center justify-between rounded-md border border-border bg-background p-3">
              <div className="space-y-0.5">
                <Label className="text-sm">Adicionar UTMs ao destino</Label>
                <p className="text-xs text-muted-foreground">
                  Inclui <code>utm_source=qr</code> no link final para rastreio externo.
                </p>
              </div>
              <Switch checked={!!pixels.addUtm} onCheckedChange={(v) => set("addUtm", v)} />
            </div>
          )}
          {configured > 0 && (
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange({
              ga4Id: null, gtmId: null, metaPixelId: null, tiktokPixelId: null,
              linkedinPartnerId: null, twitterPixelId: null, pinterestTagId: null,
              addUtm: pixels.addUtm,
            })}>
              Limpar pixels
            </Button>
          )}
        </div>
      )}
    </div>
  );
}