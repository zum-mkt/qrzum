import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Trash2, Plus, GripVertical, ChevronDown, ChevronRight } from "lucide-react";
import type { FormConfig, FormField, FormFieldType } from "@/lib/flow";

const FIELD_LABELS: Record<FormFieldType, string> = {
  text: "Texto curto",
  textarea: "Texto longo",
  choice: "Múltipla escolha",
  checkbox_list: "Checkboxes",
  rating: "Avaliação (estrelas)",
};

type Props = { config: FormConfig; onChange: (c: FormConfig) => void };

export function FormBuilderConfig({ config, onChange }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const set = (patch: Partial<FormConfig>) => onChange({ ...config, ...patch });

  const updateField = (id: string, patch: Partial<FormField>) =>
    set({ fields: config.fields.map((f) => (f.id === id ? { ...f, ...patch } : f)) });

  const removeField = (id: string) => set({ fields: config.fields.filter((f) => f.id !== id) });

  const addField = (type: FormFieldType) => {
    const field: FormField = { id: crypto.randomUUID(), type, label: FIELD_LABELS[type], required: false };
    if (type === "choice" || type === "checkbox_list") field.options = ["Opção 1", "Opção 2"];
    if (type === "rating") field.max = 5;
    set({ fields: [...config.fields, field] });
    setExpanded(field.id);
  };

  const moveField = (index: number, dir: -1 | 1) => {
    const arr = [...config.fields];
    const target = index + dir;
    if (target < 0 || target >= arr.length) return;
    [arr[index], arr[target]] = [arr[target], arr[index]];
    set({ fields: arr });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Título do formulário</Label>
          <Input value={config.title ?? ""} onChange={(e) => set({ title: e.target.value })} placeholder="Formulário" className="h-8 text-xs" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Texto do botão</Label>
          <Input value={config.submit_label ?? ""} onChange={(e) => set({ submit_label: e.target.value })} placeholder="Enviar" className="h-8 text-xs" />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-semibold">Campos ({config.fields.length})</Label>

        {config.fields.length === 0 && (
          <p className="text-xs text-muted-foreground">Nenhum campo. Adicione abaixo.</p>
        )}

        {config.fields.map((field, i) => (
          <Card key={field.id} className="overflow-hidden">
            <div
              className="flex cursor-pointer items-center gap-2 px-3 py-2 hover:bg-muted/50"
              onClick={() => setExpanded(expanded === field.id ? null : field.id)}
            >
              <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              {expanded === field.id ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
              <span className="flex-1 truncate text-xs font-medium">{field.label}</span>
              <span className="text-[10px] text-muted-foreground">{FIELD_LABELS[field.type]}</span>
              <div className="flex gap-1 ml-1" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => moveField(i, -1)} disabled={i === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-30 text-xs px-1">↑</button>
                <button onClick={() => moveField(i, 1)} disabled={i === config.fields.length - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-30 text-xs px-1">↓</button>
                <button onClick={() => removeField(field.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>

            {expanded === field.id && (
              <div className="space-y-3 border-t border-border bg-muted/20 p-3">
                <div className="space-y-1">
                  <Label className="text-xs">Rótulo</Label>
                  <Input value={field.label} onChange={(e) => updateField(field.id, { label: e.target.value })} className="h-7 text-xs" />
                </div>

                {(field.type === "text" || field.type === "textarea") && (
                  <div className="space-y-1">
                    <Label className="text-xs">Placeholder (opcional)</Label>
                    <Input value={field.placeholder ?? ""} onChange={(e) => updateField(field.id, { placeholder: e.target.value || undefined })} className="h-7 text-xs" />
                  </div>
                )}

                {(field.type === "choice" || field.type === "checkbox_list") && (
                  <div className="space-y-1">
                    <Label className="text-xs">Opções (uma por linha)</Label>
                    <textarea
                      className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs min-h-[64px]"
                      value={(field.options ?? []).join("\n")}
                      onChange={(e) => updateField(field.id, { options: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })}
                    />
                    {field.type === "choice" && (
                      <label className="flex items-center gap-2 text-xs cursor-pointer">
                        <Switch checked={!!field.multiple} onCheckedChange={(v) => updateField(field.id, { multiple: v })} />
                        Permitir múltipla seleção
                      </label>
                    )}
                  </div>
                )}

                {field.type === "rating" && (
                  <div className="space-y-1">
                    <Label className="text-xs">Máx. estrelas</Label>
                    <Input type="number" min={2} max={10} value={field.max ?? 5} onChange={(e) => updateField(field.id, { max: parseInt(e.target.value) })} className="h-7 w-20 text-xs" />
                  </div>
                )}

                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <Switch checked={!!field.required} onCheckedChange={(v) => updateField(field.id, { required: v })} />
                  Campo obrigatório
                </label>
              </div>
            )}
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {(Object.keys(FIELD_LABELS) as FormFieldType[]).map((type) => (
          <Button key={type} type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => addField(type)}>
            <Plus className="mr-1 h-3 w-3" /> {FIELD_LABELS[type]}
          </Button>
        ))}
      </div>
    </div>
  );
}
