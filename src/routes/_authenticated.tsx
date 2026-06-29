import { createFileRoute, Outlet, redirect, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { QrCode, LayoutDashboard, Plus, LogOut, BarChart3, Upload, ShieldCheck, ClipboardList, Settings, CreditCard, Layers, Sparkles, X, Bot, Clock } from "lucide-react";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { AiChatPanel } from "@/components/AiChatPanel";

const ADMIN_EMAIL = "zum@agenciazum.com.br";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({ to: "/" });
    }
  },
  component: AuthLayout,
});

function AuthLayout() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [email, setEmail] = useState<string>("");
  const [showAssistant, setShowAssistant] = useState(false);

  const isAdmin = email === ADMIN_EMAIL;

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  const NavItem = ({ to, icon: Icon, label }: { to: string; icon: typeof QrCode; label: string }) => {
    const active = pathname === to || pathname.startsWith(to + "/");
    return (
      <Link
        to={to}
        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
          active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
        }`}
      >
        <Icon className="h-4 w-4" /> {label}
      </Link>
    );
  };

  return (
    <SubscriptionProvider>
    <div className="flex min-h-screen bg-secondary/40">
      <aside className="hidden w-64 shrink-0 border-r border-border bg-card p-4 md:flex md:flex-col">
        <Link to="/dashboard" className="mb-8 px-2">
          <img src="/logo.svg" alt="zum" className="h-7" />
        </Link>
        <nav className="flex flex-col gap-1">
          <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" />
          <NavItem to="/create" icon={Plus} label="Criar QR Code" />
          <NavItem to="/bulk" icon={Upload} label="Criar em lote" />
          <NavItem to="/analytics" icon={BarChart3} label="Analytics" />
          <NavItem to="/submissions" icon={ClipboardList} label="Respostas" />
          <NavItem to="/proofs" icon={ShieldCheck} label="Provas de Presença" />
          <NavItem to="/ponto" icon={Clock} label="Registro de Ponto" />
          <NavItem to="/billing" icon={CreditCard} label="Assinatura" />
          <NavItem to="/plans" icon={Layers} label="Planos" />
          {isAdmin && (
            <NavItem to="/admin/plans" icon={Settings} label="Admin · Planos" />
          )}
          {isAdmin && (
            <NavItem to="/admin/ai" icon={Bot} label="Admin · IAs" />
          )}
        </nav>
        <div className="mt-auto space-y-2 border-t border-border pt-4">
          <p className="truncate px-2 text-xs text-muted-foreground">{email}</p>
          <Button variant="ghost" size="sm" onClick={logout} className="w-full justify-start">
            <LogOut className="mr-2 h-4 w-4" /> Sair
          </Button>
        </div>
      </aside>
      <div className="flex-1">
        <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3 md:hidden">
          <Link to="/dashboard">
            <img src="/logo.svg" alt="zum" className="h-6" />
          </Link>
          <div className="flex gap-2">
            <Link to="/create"><Button size="sm" variant="outline"><Plus className="h-4 w-4" /></Button></Link>
            <Button size="sm" variant="ghost" onClick={logout}><LogOut className="h-4 w-4" /></Button>
          </div>
        </header>
        <main className="mx-auto max-w-6xl p-6">
          <Outlet />
        </main>

        {/* Floating AI assistant */}
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
          {showAssistant && (
            <AiChatPanel
              agentSlug="dashboard_assistant"
              agentName="Assistente QRzum"
              onClose={() => setShowAssistant(false)}
              className="w-80 h-[480px] md:w-96"
            />
          )}
          <button
            onClick={() => setShowAssistant(v => !v)}
            className={`flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-all ${
              showAssistant ? "bg-secondary text-foreground" : "bg-primary text-primary-foreground"
            }`}
            title="Assistente IA"
          >
            {showAssistant ? <X className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
          </button>
        </div>
      </div>
    </div>
    </SubscriptionProvider>
  );
}