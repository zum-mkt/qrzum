import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Star } from "lucide-react";
import type { FormConfig } from "@/lib/flow";

type Props = {
  config: FormConfig;
  onSubmit: (answers: Record<string, unknown>) => void;
  loading?: boolean;
};

export function FormBlock({ config, onSubmit, loading }: Props) {
  const [values, setValues] = useState<Record<string, unknown>>({});

  const set = (id: string, v: unknown) => setValues((s) => ({ ...s, [id]: v }));

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    for (const f of config.fields) {
      if (f.required && (values[f.id] === undefined || values[f.id] === "" || (Array.isArray(values[f.id]) && (values[f.id] as unknown[]).length === 0))) {
        alert(`Campo obrigatório: ${f.label}`);
        return;
      }
    }
    onSubmit(values);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {config.title && <h2 className="text-lg font-semibold">{config.title}</h2>}

      {config.fields.map((field) => (
        <div key={field.id} className="space-y-2">
          <Label>
            {field.label}
            {field.required && <span className="ml-1 text-destructive">*</span>}
          </Label>

          {field.type === "text" && (
            <Input
              value={(values[field.id] as string) ?? ""}
              onChange={(e) => set(field.id, e.target.value)}
              placeholder={field.placeholder}
            />
          )}

          {field.type === "textarea" && (
            <Textarea
              value={(values[field.id] as string) ?? ""}
              onChange={(e) => set(field.id, e.target.value)}
              placeholder={field.placeholder}
              rows={3}
            />
          )}

          {field.type === "choice" && (
            <div className="space-y-2">
              {(field.options ?? []).map((opt) => {
                const current = (values[field.id] ?? (field.multiple ? [] : "")) as string | string[];
                const checked = field.multiple
                  ? (current as string[]).includes(opt)
                  : current === opt;
                return (
                  <label key={opt} className="flex cursor-pointer items-center gap-2 rounded-md border border-border p-2 hover:bg-muted">
                    <input
                      type={field.multiple ? "checkbox" : "radio"}
                      checked={checked}
                      onChange={() => {
                        if (field.multiple) {
                          const arr = [...((current as string[]) ?? [])];
                          const idx = arr.indexOf(opt);
                          if (idx >= 0) arr.splice(idx, 1); else arr.push(opt);
                          set(field.id, arr);
                        } else {
                          set(field.id, opt);
                        }
                      }}
                      className="accent-primary"
                    />
                    <span className="text-sm">{opt}</span>
                  </label>
                );
              })}
            </div>
          )}

          {field.type === "checkbox_list" && (
            <div className="space-y-2">
              {(field.options ?? []).map((opt) => {
                const arr = ((values[field.id] as string[]) ?? []);
                return (
                  <label key={opt} className="flex cursor-pointer items-center gap-2">
                    <Checkbox
                      checked={arr.includes(opt)}
                      onCheckedChange={(v) => {
                        const next = [...arr];
                        if (v) next.push(opt); else next.splice(next.indexOf(opt), 1);
                        set(field.id, next);
                      }}
                    />
                    <span className="text-sm">{opt}</span>
                  </label>
                );
              })}
            </div>
          )}

          {field.type === "rating" && (
            <div className="flex gap-1">
              {Array.from({ length: field.max ?? 5 }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => set(field.id, n)}
                  className="focus:outline-none"
                >
                  <Star
                    className={`h-7 w-7 transition-colors ${
                      n <= ((values[field.id] as number) ?? 0)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-muted-foreground"
                    }`}
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      ))}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Enviando…" : (config.submit_label || "Enviar")}
      </Button>
    </form>
  );
}
