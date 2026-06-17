import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";
import { sha256Hex, type PasswordGateConfig } from "@/lib/flow";

type Props = { config: PasswordGateConfig; onChange: (c: PasswordGateConfig) => void };

export function PasswordGateConfig({ config, onChange }: Props) {
  const [plain, setPlain] = useState("");
  const [show, setShow] = useState(false);
  const [set, setSet] = useState(!!config.password_hash);

  const apply = async () => {
    if (!plain.trim()) return;
    const hash = await sha256Hex(plain.trim());
    onChange({ ...config, password_hash: hash });
    setSet(true);
    setPlain("");
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-xs">Dica para o usuário (opcional)</Label>
        <Input
          value={config.hint ?? ""}
          onChange={(e) => onChange({ ...config, hint: e.target.value || undefined })}
          placeholder="Ex: Pergunte ao atendente"
          className="h-8 text-xs"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">{set ? "Nova senha (deixe em branco para manter)" : "Senha"}</Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              type={show ? "text" : "password"}
              value={plain}
              onChange={(e) => setPlain(e.target.value)}
              placeholder="Digite a senha…"
              className="h-8 pr-8 text-xs"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
              tabIndex={-1}
            >
              {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          </div>
          <Button type="button" size="sm" onClick={apply} disabled={!plain.trim()} className="h-8">
            Definir
          </Button>
        </div>
        {set && !plain && (
          <p className="text-xs text-green-600">Senha definida. Insira uma nova para trocar.</p>
        )}
      </div>
    </div>
  );
}
