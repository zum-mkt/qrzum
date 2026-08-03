import { useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function Field({
  id, label, type, value, onChange,
}: {
  id: string; label: string; type: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} required />
    </div>
  );
}

export function AuthForm({
  defaultTab = "signup",
  redirectTo = "/dashboard",
}: {
  defaultTab?: "signup" | "signin";
  redirectTo?: string;
}) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const onSignIn = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    navigate({ to: redirectTo });
  };

  const onSignUp = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}${redirectTo}` },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Conta criada! Redirecionando...");
    navigate({ to: redirectTo });
  };

  const onGoogleSignIn = async () => {
    setGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}${redirectTo}` },
    });
    if (error) {
      toast.error(error.message);
      setGoogleLoading(false);
    }
    // On success, browser is redirected to Google — no need to setLoading(false)
  };

  return (
    <div>
      {/* Google OAuth */}
      <Button
        type="button"
        variant="outline"
        className="w-full gap-2"
        onClick={onGoogleSignIn}
        disabled={googleLoading}
      >
        <GoogleIcon />
        {googleLoading ? "Redirecionando..." : "Continuar com Google"}
      </Button>

      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-card px-3 text-xs text-muted-foreground">ou use seu email</span>
        </div>
      </div>

      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="signup">Criar conta</TabsTrigger>
          <TabsTrigger value="signin">Entrar</TabsTrigger>
        </TabsList>
        <TabsContent value="signup">
          <form onSubmit={onSignUp} className="mt-4 space-y-4">
            <Field id="su-email" label="Email" type="email" value={email} onChange={setEmail} />
            <Field id="su-pass" label="Senha" type="password" value={password} onChange={setPassword} />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Criando..." : "Criar conta grátis"}
            </Button>
          </form>
        </TabsContent>
        <TabsContent value="signin">
          <form onSubmit={onSignIn} className="mt-4 space-y-4">
            <Field id="si-email" label="Email" type="email" value={email} onChange={setEmail} />
            <Field id="si-pass" label="Senha" type="password" value={password} onChange={setPassword} />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}
