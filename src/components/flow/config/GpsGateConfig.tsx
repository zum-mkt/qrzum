import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { GpsGateConfig } from "@/lib/flow";

type Props = { config: GpsGateConfig; onChange: (c: GpsGateConfig) => void };

export function GpsGateConfig({ config, onChange }: Props) {
  const set = (patch: Partial<GpsGateConfig>) => onChange({ ...config, ...patch });
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Latitude</Label>
          <Input type="number" step="any" value={config.lat} onChange={(e) => set({ lat: parseFloat(e.target.value) })} className="h-8 text-xs" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Longitude</Label>
          <Input type="number" step="any" value={config.lng} onChange={(e) => set({ lng: parseFloat(e.target.value) })} className="h-8 text-xs" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Raio (m)</Label>
          <Input type="number" min={10} value={config.radius_m} onChange={(e) => set({ radius_m: parseInt(e.target.value) })} className="h-8 text-xs" />
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Mensagem de erro (opcional)</Label>
        <Input value={config.error_message ?? ""} onChange={(e) => set({ error_message: e.target.value || undefined })} placeholder="Você não está na localização correta." className="h-8 text-xs" />
      </div>
    </div>
  );
}
