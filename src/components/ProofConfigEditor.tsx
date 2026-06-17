import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { setProofConfig } from "@/lib/presence.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

type Anchor = { lat: number; lng: number; radius_m: number; label?: string };

export function ProofConfigEditor({ qrId }: { qrId: string }) {
  const qc = useQueryClient();
  const { data: cfg, isLoading } = useQuery({
    queryKey: ["proof-config", qrId],
    queryFn: async () => {
      const { data } = await supabase
        .from("qr_links")
        .select("proof_enabled, proof_anchor")
        .eq("id", qrId)
        .maybeSingle();
      return data;
    },
  });

  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const [saving, setSaving] = useState(false);

  const effectiveEnabled = enabled ?? cfg?.proof_enabled ?? false;
  const effectiveAnchor: Anchor =
    anchor ?? (cfg?.proof_anchor as Anchor | null) ?? { lat: 0, lng: 0, radius_m: 50, label: "" };

  const updateAnchor = (patch: Partial<Anchor>) => setAnchor({ ...effectiveAnchor, ...patch });

  const save = async () => {
    if (effectiveEnabled && (isNaN(effectiveAnchor.lat) || isNaN(effectiveAnchor.lng))) {
      return toast.error("Latitude e longitude são obrigatórios");
    }
    setSaving(true);
    try {
      await setProofConfig({
        data: {
          qrId,
          enabled: effectiveEnabled,
          anchor: effectiveEnabled ? { ...effectiveAnchor } : null,
        },
      });
      qc.invalidateQueries({ queryKey: ["proof-config", qrId] });
      toast.success("Configuração salva");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <p className="py-4 text-sm text-muted-foreground">Carregando…</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-lg border border-border p-3">
        <Switch checked={effectiveEnabled} onCheckedChange={setEnabled} />
        <div>
          <p className="text-sm font-medium">Prova de presença</p>
          <p className="text-xs text-muted-foreground">
            O scan emite um certificado HMAC verificável com localização, nonce e assinatura.
          </p>
        </div>
      </div>

      {effectiveEnabled && (
        <div className="space-y-3 rounded-lg border border-border p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Âncora de localização
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Latitude</Label>
              <Input
                type="number"
                step="any"
                value={effectiveAnchor.lat}
                onChange={(e) => updateAnchor({ lat: parseFloat(e.target.value) })}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Longitude</Label>
              <Input
                type="number"
                step="any"
                value={effectiveAnchor.lng}
                onChange={(e) => updateAnchor({ lng: parseFloat(e.target.value) })}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Raio (m)</Label>
              <Input
                type="number"
                min={5}
                value={effectiveAnchor.radius_m}
                onChange={(e) => updateAnchor({ radius_m: parseInt(e.target.value) })}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Rótulo (opcional)</Label>
              <Input
                placeholder="Ex: Escritório SP"
                value={effectiveAnchor.label ?? ""}
                onChange={(e) => updateAnchor({ label: e.target.value || undefined })}
                className="h-8 text-xs"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            O scan só é aceito se a localização do dispositivo estiver dentro do raio definido (máx. precisão 100 m).
          </p>
        </div>
      )}

      <div className="flex justify-end">
        <Button type="button" size="sm" onClick={save} disabled={saving}>
          {saving ? "Salvando…" : "Salvar presença"}
        </Button>
      </div>
    </div>
  );
}
