import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, Plus } from "lucide-react";
import type { FlowNotification } from "@/lib/flow";

type Props = { notifications: FlowNotification[]; onChange: (n: FlowNotification[]) => void };

export function NotificationsConfig({ notifications, onChange }: Props) {
  const update = (i: number, patch: Partial<FlowNotification>) =>
    onChange(notifications.map((n, idx) => (idx === i ? { ...n, ...patch } : n)));

  const remove = (i: number) => onChange(notifications.filter((_, idx) => idx !== i));

  const add = () =>
    onChange([...notifications, { webhook_url: "", on: ["submit"] }]);

  const toggleTrigger = (i: number, event: "submit" | "view") => {
    const current = notifications[i].on;
    const next = current.includes(event) ? current.filter((e) => e !== event) : [...current, event];
    update(i, { on: next as ("submit" | "view")[] });
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Webhooks disparam um POST com o payload do evento para a URL configurada.
        Compatível com Zapier, Make, n8n, Google Apps Script, etc.
      </p>

      {notifications.length === 0 && (
        <p className="text-xs text-muted-foreground">Nenhum webhook configurado.</p>
      )}

      {notifications.map((n, i) => (
        <div key={i} className="space-y-2 rounded-lg border border-border p-3">
          <div className="flex gap-2">
            <Input
              placeholder="https://hooks.zapier.com/…"
              value={n.webhook_url}
              onChange={(e) => update(i, { webhook_url: e.target.value })}
              className="h-8 flex-1 text-xs"
            />
            <button onClick={() => remove(i)} className="text-muted-foreground hover:text-destructive">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          <div className="flex gap-4">
            <Label className="text-xs font-normal text-muted-foreground">Disparar em:</Label>
            <label className="flex cursor-pointer items-center gap-1.5 text-xs">
              <Checkbox checked={n.on.includes("submit")} onCheckedChange={() => toggleTrigger(i, "submit")} />
              Envio de formulário
            </label>
            <label className="flex cursor-pointer items-center gap-1.5 text-xs">
              <Checkbox checked={n.on.includes("view")} onCheckedChange={() => toggleTrigger(i, "view")} />
              Abertura do fluxo
            </label>
          </div>
        </div>
      ))}

      <Button type="button" variant="outline" size="sm" onClick={add}>
        <Plus className="mr-1 h-4 w-4" /> Adicionar webhook
      </Button>
    </div>
  );
}
