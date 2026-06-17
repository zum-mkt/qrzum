import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { MessageConfig } from "@/lib/flow";

type Props = { config: MessageConfig; onChange: (c: MessageConfig) => void };

export function MessageConfig({ config, onChange }: Props) {
  const set = (patch: Partial<MessageConfig>) => onChange({ ...config, ...patch });
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-xs">Título</Label>
        <Input value={config.title} onChange={(e) => set({ title: e.target.value })} placeholder="Obrigado!" className="h-8 text-xs" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Corpo do texto (opcional)</Label>
        <Textarea value={config.body ?? ""} onChange={(e) => set({ body: e.target.value || undefined })} placeholder="Sua resposta foi registrada." rows={3} className="text-xs" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">URL da imagem (opcional)</Label>
        <Input value={config.image_url ?? ""} onChange={(e) => set({ image_url: e.target.value || undefined })} placeholder="https://…" className="h-8 text-xs" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Texto do botão CTA</Label>
          <Input value={config.cta_label ?? ""} onChange={(e) => set({ cta_label: e.target.value || undefined })} placeholder="Saiba mais" className="h-8 text-xs" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">URL do CTA</Label>
          <Input value={config.cta_url ?? ""} onChange={(e) => set({ cta_url: e.target.value || undefined })} placeholder="https://…" className="h-8 text-xs" />
        </div>
      </div>
    </div>
  );
}
