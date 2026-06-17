import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listRoutingRules, saveRoutingRules } from "@/lib/routing.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

type RuleKind = "schedule" | "geofence" | "identity";
type RuleAction = "redirect" | "block";

type Rule = {
  id?: string;
  kind: RuleKind;
  config: Record<string, any>;
  action: RuleAction;
  destination_url: string | null;
  enabled: boolean;
};

const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function defaultConfig(kind: RuleKind): Record<string, any> {
  if (kind === "schedule") return { days: [1, 2, 3, 4, 5], start: "08:00", end: "18:00" };
  if (kind === "geofence") return { lat: 0, lng: 0, radius_m: 100, mode: "allow" };
  return { role: "user" };
}

function NativeSelect({
  value, onChange, children, className,
}: { value: string; onChange: (v: string) => void; children: React.ReactNode; className?: string }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`h-8 rounded-md border border-input bg-background px-2 text-xs ${className ?? ""}`}
    >
      {children}
    </select>
  );
}

export function RoutingRulesEditor({ qrId }: { qrId: string }) {
  const qc = useQueryClient();
  const { data: initial, isLoading } = useQuery({
    queryKey: ["routing-rules", qrId],
    queryFn: () => listRoutingRules({ data: { qrId } }),
  });

  const [rules, setRules] = useState<Rule[] | null>(null);
  const [saving, setSaving] = useState(false);

  const effective: Rule[] = rules ?? (initial ?? []) as Rule[];

  const update = (i: number, patch: Partial<Rule>) =>
    setRules(effective.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const updateConfig = (i: number, patch: Record<string, any>) =>
    update(i, { config: { ...effective[i].config, ...patch } });

  const addRule = () =>
    setRules([
      ...effective,
      { kind: "schedule", config: defaultConfig("schedule"), action: "redirect", destination_url: null, enabled: true },
    ]);

  const removeRule = (i: number) => setRules(effective.filter((_, idx) => idx !== i));

  const save = async () => {
    setSaving(true);
    try {
      await saveRoutingRules({ data: { qrId, rules: effective.map((r, i) => ({ ...r, priority: i })) } });
      qc.invalidateQueries({ queryKey: ["routing-rules", qrId] });
      setRules(null);
      toast.success("Regras salvas");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <p className="py-4 text-sm text-muted-foreground">Carregando…</p>;

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Regras são avaliadas em ordem. A primeira que bater é aplicada; se nenhuma bater, usa a URL padrão.
      </p>

      {effective.length === 0 && (
        <p className="py-2 text-sm text-muted-foreground">Nenhuma regra. O QR usa a URL padrão.</p>
      )}

      {effective.map((rule, i) => (
        <Card key={i} className="space-y-3 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="w-5 text-center text-xs font-semibold text-muted-foreground">#{i + 1}</span>

            <NativeSelect value={rule.kind} onChange={(v) => update(i, { kind: v as RuleKind, config: defaultConfig(v as RuleKind) })}>
              <option value="schedule">Agendamento</option>
              <option value="geofence">Geofence</option>
              <option value="identity">Identidade</option>
            </NativeSelect>

            <NativeSelect value={rule.action} onChange={(v) => update(i, { action: v as RuleAction })}>
              <option value="redirect">Redirecionar para</option>
              <option value="block">Bloquear</option>
            </NativeSelect>

            <div className="ml-auto flex items-center gap-2">
              <Switch checked={rule.enabled} onCheckedChange={(v) => update(i, { enabled: v })} />
              <button onClick={() => removeRule(i)} className="text-muted-foreground hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {rule.kind === "schedule" && (
            <div className="space-y-2 pl-6">
              <div className="flex flex-wrap gap-3">
                {DAYS.map((d, idx) => (
                  <label key={idx} className="flex cursor-pointer items-center gap-1 text-xs">
                    <Checkbox
                      checked={(rule.config.days ?? []).includes(idx)}
                      onCheckedChange={(v) => {
                        const days: number[] = rule.config.days ?? [];
                        updateConfig(i, {
                          days: v ? [...days, idx].sort() : days.filter((x) => x !== idx),
                        });
                      }}
                    />
                    {d}
                  </label>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="time"
                  value={rule.config.start ?? "08:00"}
                  onChange={(e) => updateConfig(i, { start: e.target.value })}
                  className="h-8 w-32 text-xs"
                />
                <span className="text-xs text-muted-foreground">até</span>
                <Input
                  type="time"
                  value={rule.config.end ?? "18:00"}
                  onChange={(e) => updateConfig(i, { end: e.target.value })}
                  className="h-8 w-32 text-xs"
                />
                <span className="text-xs text-muted-foreground">(UTC)</span>
              </div>
            </div>
          )}

          {rule.kind === "geofence" && (
            <div className="grid grid-cols-2 gap-3 pl-6">
              <div className="space-y-1">
                <Label className="text-xs">Latitude</Label>
                <Input
                  type="number"
                  step="any"
                  value={rule.config.lat ?? 0}
                  onChange={(e) => updateConfig(i, { lat: parseFloat(e.target.value) })}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Longitude</Label>
                <Input
                  type="number"
                  step="any"
                  value={rule.config.lng ?? 0}
                  onChange={(e) => updateConfig(i, { lng: parseFloat(e.target.value) })}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Raio (m)</Label>
                <Input
                  type="number"
                  min={10}
                  value={rule.config.radius_m ?? 100}
                  onChange={(e) => updateConfig(i, { radius_m: parseInt(e.target.value) })}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Modo</Label>
                <NativeSelect
                  value={rule.config.mode ?? "allow"}
                  onChange={(v) => updateConfig(i, { mode: v })}
                  className="w-full"
                >
                  <option value="allow">Permitir dentro</option>
                  <option value="block">Bloquear dentro</option>
                </NativeSelect>
              </div>
            </div>
          )}

          {rule.kind === "identity" && (
            <div className="pl-6">
              <div className="space-y-1">
                <Label className="text-xs">Role exigida</Label>
                <NativeSelect
                  value={rule.config.role ?? "user"}
                  onChange={(v) => updateConfig(i, { role: v })}
                >
                  <option value="user">user</option>
                  <option value="moderator">moderator</option>
                  <option value="admin">admin</option>
                </NativeSelect>
              </div>
            </div>
          )}

          {rule.action === "redirect" && (
            <div className="pl-6">
              <div className="space-y-1">
                <Label className="text-xs">URL de destino (override)</Label>
                <Input
                  placeholder="https://…"
                  value={rule.destination_url ?? ""}
                  onChange={(e) => update(i, { destination_url: e.target.value || null })}
                  className="h-8 text-xs"
                />
              </div>
            </div>
          )}
        </Card>
      ))}

      <div className="flex items-center justify-between pt-1">
        <Button type="button" variant="outline" size="sm" onClick={addRule}>
          <Plus className="mr-1 h-4 w-4" /> Adicionar regra
        </Button>
        <Button type="button" size="sm" onClick={save} disabled={saving}>
          {saving ? "Salvando…" : "Salvar regras"}
        </Button>
      </div>
    </div>
  );
}
