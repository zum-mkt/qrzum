import { createFileRoute } from "@tanstack/react-router";
import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { QrCode, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "QRFlow — Gerador e Gerenciador de QR Codes Dinâmicos" },
      { name: "description", content: "Crie, gerencie e rastreie QR Codes dinâmicos para links, arquivos e vCards. Editável a qualquer momento, com analytics de cliques." },
    ],
  }),
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
      else setChecking(false);
    });
  }, [navigate]);

  if (checking) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
            <QrCode className="h-5 w-5" />
          </span>
          QRFlow
        </Link>
      </header>
      <main className="mx-auto grid max-w-6xl gap-12 px-6 py-12 lg:grid-cols-2 lg:py-20">
        <div className="flex flex-col justify-center">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
            <Sparkles className="h-3 w-3" /> QR Codes dinâmicos com tracking
          </div>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Gere, gerencie e edite seus QR Codes a qualquer momento.
          </h1>
          <p className="mt-4 max-w-md text-muted-foreground">
            Link, arquivo (PDF/imagem) ou vCard. Troque o destino sem reimprimir,
            acompanhe os cliques e baixe em PNG/SVG.
          </p>
          <ul className="mt-6 space-y-2 text-sm text-muted-foreground">
            <li>• Curto e único para cada QR (`/q/AbC12`)</li>
            <li>• Tracking de cliques no painel</li>
            <li>• vCard com página mobile-friendly</li>
          </ul>
        </div>

        <AuthCard />
      </main>
    </div>
  );
}

function AuthCard() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSignIn = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    navigate({ to: "/dashboard" });
  };

  const onSignUp = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/dashboard` },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Conta criada! Redirecionando...");
    navigate({ to: "/dashboard" });
  };

  return (
    <Card className="p-6 shadow-lg">
      <Tabs defaultValue="signin" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="signin">Entrar</TabsTrigger>
          <TabsTrigger value="signup">Criar conta</TabsTrigger>
        </TabsList>
        <TabsContent value="signin">
          <form onSubmit={onSignIn} className="mt-4 space-y-4">
            <Field id="si-email" label="Email" type="email" value={email} onChange={setEmail} />
            <Field id="si-pass" label="Senha" type="password" value={password} onChange={setPassword} />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </form>
        </TabsContent>
        <TabsContent value="signup">
          <form onSubmit={onSignUp} className="mt-4 space-y-4">
            <Field id="su-email" label="Email" type="email" value={email} onChange={setEmail} />
            <Field id="su-pass" label="Senha" type="password" value={password} onChange={setPassword} />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Criando..." : "Criar conta"}
            </Button>
          </form>
        </TabsContent>
      </Tabs>
    </Card>
  );
}

function Field({ id, label, type, value, onChange }: { id: string; label: string; type: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} required />
    </div>
  );
}
