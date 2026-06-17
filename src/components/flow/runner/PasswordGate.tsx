import { useState, type FormEvent } from "react";
import { Lock, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sha256Hex, type PasswordGateConfig } from "@/lib/flow";

type Props = { config: PasswordGateConfig; onPass: () => void };

export function PasswordGate({ config, onPass }: Props) {
  const [value, setValue] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(false);
    const hash = await sha256Hex(value.trim());
    if (hash === config.password_hash) {
      onPass();
    } else {
      setError(true);
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      <div className="grid h-16 w-16 place-items-center rounded-full bg-primary/10">
        <Lock className="h-8 w-8 text-primary" />
      </div>
      <div className="text-center">
        <p className="font-semibold">Conteúdo protegido</p>
        {config.hint && <p className="mt-1 text-sm text-muted-foreground">{config.hint}</p>}
      </div>
      <form onSubmit={submit} className="w-full max-w-xs space-y-3">
        <div className="space-y-1">
          <Label>Senha de acesso</Label>
          <div className="relative">
            <Input
              type={show ? "text" : "password"}
              value={value}
              onChange={(e) => { setValue(e.target.value); setError(false); }}
              placeholder="Digite a senha…"
              className={error ? "border-destructive pr-10" : "pr-10"}
              autoFocus
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              onClick={() => setShow((s) => !s)}
              tabIndex={-1}
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {error && <p className="text-xs text-destructive">Senha incorreta.</p>}
        </div>
        <Button type="submit" className="w-full" disabled={loading || !value.trim()}>
          {loading ? "Verificando…" : "Acessar"}
        </Button>
      </form>
    </div>
  );
}
