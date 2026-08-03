import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthForm } from "@/components/AuthForm";
import { HeroBackdrop } from "@/components/HeroBackdrop";
import { HeroAnimation } from "@/components/HeroAnimation";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [{ title: "Entrar — zum" }],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
      else setChecking(false);
    });
  }, [navigate]);

  if (checking) return null;

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-2">
      {/* Left: form */}
      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <a href="/">
            <img src="/logo.svg" alt="zum" className="mb-8 h-8" />
          </a>
          <h1 className="text-2xl font-bold text-foreground">Entrar no zum</h1>
          <p className="mt-1 text-sm text-muted-foreground">Acesse sua conta para continuar</p>
          <div className="mt-8">
            <AuthForm defaultTab="signin" />
          </div>
        </div>
      </div>

      {/* Right: hero-style visual, hidden on narrow widths */}
      <div
        className="relative hidden overflow-hidden lg:flex lg:items-center lg:justify-center"
        style={{ background: "linear-gradient(155deg, #133249 0%, #0f2637 50%, #0a1925 100%)" }}
      >
        <HeroBackdrop />
        <div className="relative w-full max-w-lg px-12">
          <HeroAnimation className="h-auto w-full drop-shadow-2xl" />
        </div>
      </div>
    </div>
  );
}
