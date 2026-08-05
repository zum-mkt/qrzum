import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  QrCode, MapPin, Lock, FileText, MessageSquare, Shield, Brain,
  BarChart3, CheckCircle, ArrowRight, Building2, Factory, Users,
  Globe, Clock, Download, TrendingUp, RefreshCw, Wifi, Phone,
  Layers, Zap, Star, Workflow, Link2, ChevronRight, Check, X,
} from "lucide-react";
import { HeroAnimation } from "@/components/HeroAnimation";
import { HeroBackdrop } from "@/components/HeroBackdrop";
import { AuthForm } from "@/components/AuthForm";
import { isStandalonePwa } from "@/lib/pwaDisplayMode";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ZRCODE — Automatize operações com QR Codes inteligentes" },
      {
        name: "description",
        content:
          "Fluxos de campo, presença certificada, formulários e IA em QR Codes dinâmicos para empresas e indústrias.",
      },
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
      else if (isStandalonePwa()) navigate({ to: "/login", search: { tab: "signin" }, replace: true });
      else setChecking(false);
    });
  }, [navigate]);

  if (checking) return null;

  return (
    <div className="min-h-screen bg-background" style={{ scrollBehavior: "smooth" }}>
      <Nav />
      <Hero />
      <StatsBar />
      <FlowBuilderSection />
      <QrTypesSection />
      <ProofRoutingSection />
      <PontoSection />
      <AiSection />
      <AnalyticsSection />
      <UseCasesSection />
      <PricingSection />
      <AuthSection />
      <Footer />
    </div>
  );
}

/* ─────────────── Navigation ─────────────── */
export function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <a href="#">
          <img src="/logo.svg" alt="ZRCODE" className="h-8" />
        </a>
        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          <a href="#fluxo" className="transition-colors hover:text-foreground">Fluxo Operacional</a>
          <a href="#presenca" className="transition-colors hover:text-foreground">Presença Certificada</a>
          <a href="#ponto" className="transition-colors hover:text-foreground">Ponto</a>
          <a href="#ia" className="transition-colors hover:text-foreground">IA</a>
          <a href="#analytics" className="transition-colors hover:text-foreground">Analytics</a>
          <a href="#planos" className="transition-colors hover:text-foreground">Planos</a>
          <a
            href="https://zrcode.gitbook.io/zrcode/"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-foreground"
          >
            Documentação
          </a>
        </nav>
        <div className="flex gap-2">
          <Link to="/login" search={{ tab: "signin" }}>
            <Button variant="outline" size="sm">Entrar</Button>
          </Link>
          <Link to="/login" search={{ tab: "signup" }}>
            <Button size="sm" className="hidden sm:inline-flex">Criar conta grátis</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}

/* ─────────────── Hero ─────────────── */
function Hero() {
  return (
    <section
      className="relative overflow-hidden py-24 text-background lg:py-36"
      style={{ background: "linear-gradient(155deg, #133249 0%, #0f2637 50%, #0a1925 100%)" }}
    >
      {/* QR-like square texture that fades with the gradient */}
      <HeroBackdrop />
      <div className="relative mx-auto max-w-6xl px-6">
        <div className="flex flex-col items-start gap-0 lg:flex-row lg:items-center lg:gap-12">
          {/* Left: copy */}
          <div className="flex-1 min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Zap className="h-3 w-3" /> Automação empresarial e industrial
            </div>
            <h1 className="mt-6 max-w-2xl text-5xl font-bold leading-tight tracking-tight sm:text-6xl lg:text-7xl">
              QR Codes que{" "}
              <span className="text-primary">automatizam</span>{" "}
              sua operação
            </h1>
            <p className="mt-6 max-w-xl text-xl text-background/60">
              Substitua planilhas, assinaturas físicas e processos manuais por fluxos inteligentes.
              GPS, formulários, presença certificada e IA — tudo em um QR Code dinâmico.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <a href="#entrar">
                <Button size="lg" className="gap-2 text-base">
                  Começar grátis <ArrowRight className="h-4 w-4" />
                </Button>
              </a>
              <a href="#fluxo">
                <Button
                  size="lg"
                  variant="outline"
                  className="gap-2 border-background/20 text-[#133249] bg-background hover:bg-background/90"
                >
                  Ver como funciona <ChevronRight className="h-4 w-4" />
                </Button>
              </a>
            </div>
            <div className="mt-12 flex flex-wrap gap-6 text-sm text-background/40">
              <span className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-primary" /> Sem contrato
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-primary" /> QR Codes ilimitados
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-primary" /> Dados 100% seus
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-primary" /> Exportação CSV
              </span>
            </div>
          </div>

          {/* Right: animated illustration */}
          <div className="mt-12 w-full max-w-sm self-center lg:mt-0 lg:max-w-lg xl:max-w-xl shrink-0">
            <HeroAnimation className="w-full h-auto drop-shadow-2xl" />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────── Stats bar ─────────────── */
function StatsBar() {
  const stats = [
    { value: "9", label: "tipos de QR Code" },
    { value: "4", label: "blocos de fluxo operacional" },
    { value: "7", label: "integrações de analytics" },
    { value: "HMAC‑SHA256", label: "presença certificada" },
  ];
  return (
    <section className="bg-primary py-6 text-primary-foreground">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          {stats.map(({ value, label }) => (
            <div key={label} className="text-center">
              <div className="text-2xl font-bold md:text-3xl">{value}</div>
              <div className="mt-1 text-xs text-primary-foreground/60">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────── Flow Builder ─────────────── */
const FLOW_BLOCKS = [
  {
    icon: MapPin,
    tag: "Geolocalização",
    title: "Portão GPS",
    desc: "Valida que o colaborador está no local exato antes de prosseguir. Raio configurável, mensagem de erro personalizada.",
  },
  {
    icon: Lock,
    tag: "Segurança",
    title: "Portão de Senha",
    desc: "Restringe acesso por senha (hash SHA-256). Dica opcional para usuários autorizados.",
  },
  {
    icon: FileText,
    tag: "Coleta de dados",
    title: "Formulário de Campo",
    desc: "Texto, seleção, avaliação e listas — dados estruturados com localização e timestamp.",
  },
  {
    icon: MessageSquare,
    tag: "Confirmação",
    title: "Tela de Conclusão",
    desc: "Encerra o fluxo com mensagem, imagem e CTA. Registra conclusão com metadados completos.",
  },
];

function FlowBuilderSection() {
  return (
    <section id="fluxo" className="bg-[#133249] py-20 text-background">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-12">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">
            Fluxo Operacional
          </span>
          <h2 className="mt-3 text-4xl font-bold">
            Substitua processos manuais<br />por fluxos inteligentes no campo
          </h2>
          <p className="mt-4 max-w-2xl text-lg text-background/60">
            Monte sequências de etapas com blocos visuais. O colaborador escaneia o QR e segue o fluxo —
            validado por GPS, senha ou ambos. Respostas salvas com coordenadas, dispositivo e horário.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {FLOW_BLOCKS.map(({ icon: Icon, tag, title, desc }, i) => (
            <div
              key={title}
              className="rounded-xl border border-background/10 bg-background/5 p-5 transition-colors hover:bg-background/10"
            >
              <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-primary/20 px-2.5 py-1 text-xs font-medium text-primary">
                <Icon className="h-3 w-3" /> {tag}
              </div>
              <div className="mb-1 text-xs text-background/30 font-mono">bloco {i + 1}</div>
              <h3 className="font-semibold text-background">{title}</h3>
              <p className="mt-2 text-sm text-background/55">{desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="flex items-start gap-4 rounded-xl border border-background/10 bg-background/5 p-5">
            <Link2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <div className="font-semibold text-background">Webhooks em tempo real</div>
              <p className="mt-1 text-sm text-background/55">
                Cada submissão dispara um POST para seu CRM, ERP ou sistema interno.
                Gatilhos configuráveis: <code className="text-primary">submit</code> e <code className="text-primary">view</code>.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4 rounded-xl border border-primary/30 bg-primary/10 p-5">
            <BarChart3 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <div className="font-semibold text-background">Dashboard de respostas</div>
              <p className="mt-1 text-sm text-background/55">
                Visualize, filtre por QR e exporte todas as submissões com localização, dispositivo e horário.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────── QR Types ─────────────── */
const QR_TYPES = [
  { icon: Globe,       label: "Link / URL",           desc: "Qualquer endereço web, editável a qualquer hora" },
  { icon: FileText,    label: "PDF",                   desc: "Documento direto, sem página intermediária" },
  { icon: Layers,      label: "Lista de Links",        desc: "Bio page com múltiplos links" },
  { icon: Phone,       label: "vCard",                 desc: "Cartão digital com contato completo" },
  { icon: Wifi,        label: "Wi-Fi",                 desc: "Compartilhe credenciais sem digitar nada" },
  { icon: MessageSquare, label: "WhatsApp",            desc: "Inicia conversa com mensagem pré-definida" },
  { icon: TrendingUp,  label: "Vídeo",                 desc: "Player otimizado para mobile" },
  { icon: Workflow,    label: "Fluxo Operacional",     desc: "Automação multietapa com GPS e formulários" },
  { icon: Download,    label: "Arquivo",               desc: "Download direto de qualquer arquivo" },
  { icon: Clock,       label: "Registro de Ponto",     desc: "Controle de presença com geofence e biometria" },
];

function QrTypesSection() {
  return (
    <section className="bg-background py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-12 text-center">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">
            10 formatos
          </span>
          <h2 className="mt-3 text-4xl font-bold text-foreground">Um QR para cada necessidade</h2>
          <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
            Todos dinâmicos — mude o destino sem reimprimir. Download em PNG e SVG com
            7 estilos de moldura e paletas de cores personalizadas.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {QR_TYPES.map(({ icon: Icon, label, desc }) => (
            <div
              key={label}
              className="flex items-start gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40"
            >
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-secondary text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <div className="font-medium text-foreground">{label}</div>
                <div className="mt-0.5 text-sm text-muted-foreground">{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────── Proof + Routing ─────────────── */
function ProofRoutingSection() {
  return (
    <section id="presenca" className="bg-secondary py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Presence Proof */}
          <div className="rounded-2xl bg-[#133249] p-8 text-background">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/20 px-3 py-1 text-xs font-semibold text-primary">
              <Shield className="h-3 w-3" /> Prova de Presença
            </div>
            <h2 className="mt-4 text-3xl font-bold">
              Comprovante digital com assinatura criptográfica
            </h2>
            <p className="mt-3 text-background/60">
              Cada scan gera um certificado HMAC-SHA256 vinculado à localização GPS.
              Impossível falsificar, verificável publicamente por link único.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "Precisão GPS exigida (raio configurável)",
                "Hash HMAC-SHA256 irreversível",
                "Timestamp registrado no servidor",
                "Verificação pública por link único",
                "Histórico completo de todas as presenças",
              ].map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm text-background/80">
                  <CheckCircle className="h-4 w-4 shrink-0 text-primary" /> {item}
                </li>
              ))}
            </ul>
            <div className="mt-6 rounded-lg border border-background/10 bg-background/5 p-4 font-mono text-xs text-primary">
              HMAC‑SHA256(qr_id ∥ lat ∥ lng ∥ timestamp, secret)
            </div>
          </div>

          {/* Routing Rules */}
          <div className="rounded-2xl border border-border bg-card p-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-foreground/60">
              <RefreshCw className="h-3 w-3" /> Roteamento Contextual
            </div>
            <h2 className="mt-4 text-3xl font-bold text-foreground">
              O mesmo QR, destinos diferentes por contexto
            </h2>
            <p className="mt-3 text-muted-foreground">
              Configure regras que se ativam automaticamente sem mudar o QR impresso.
            </p>
            <div className="mt-6 space-y-5">
              {[
                {
                  icon: Clock,
                  title: "Por horário",
                  desc: "Conteúdos diferentes por turno — manhã, tarde ou noite. Configurável por dias da semana.",
                },
                {
                  icon: MapPin,
                  title: "Por geolocalização",
                  desc: "Redirecione ou bloqueie acessos de fora da área geográfica autorizada.",
                },
                {
                  icon: Users,
                  title: "Por perfil de usuário",
                  desc: "Conteúdo segmentado por papel: técnico, supervisor, cliente, visitante.",
                },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex gap-4">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-secondary text-foreground">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-medium text-foreground">{title}</div>
                    <div className="mt-0.5 text-sm text-muted-foreground">{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────── Ponto Section ─────────────── */
function PontoSection() {
  const features = [
    "Geofence configurável — só registra dentro do raio permitido",
    "Vínculo de dispositivo — cada funcionário só pode usar o próprio celular",
    "Biometria WebAuthn — impressão digital ou Face ID no aparelho",
    "PIN individual por funcionário",
    "Relatório de ponto exportável em CSV",
    "Dashboard em tempo real com entradas e saídas",
  ];
  return (
    <section id="ponto" className="bg-background py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Clock className="h-3 w-3" /> Registro de Ponto
            </span>
            <h2 className="mt-4 text-4xl font-bold text-foreground">
              Controle de presença com 3 camadas de segurança
            </h2>
            <p className="mt-4 text-muted-foreground">
              Um QR Code por local de trabalho. O funcionário escaneia, confirma com PIN, e o sistema valida GPS, dispositivo e biometria antes de registrar a entrada ou saída.
            </p>
            <ul className="mt-6 space-y-3">
              {features.map((f) => (
                <li key={f} className="flex items-start gap-3 text-sm text-muted-foreground">
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {f}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Hoje — Escritório SP</h3>
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">ao vivo</span>
            </div>
            <div className="space-y-3">
              {[
                { name: "Ana Lima", time: "08:03", type: "in" },
                { name: "Carlos Melo", time: "08:17", type: "in" },
                { name: "Juliana Torres", time: "12:01", type: "out" },
                { name: "Roberto Faria", time: "12:45", type: "in" },
                { name: "Ana Lima", time: "17:02", type: "out" },
              ].map((r, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg bg-secondary px-4 py-2.5">
                  <div className="flex items-center gap-3">
                    <div className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {r.name[0]}
                    </div>
                    <span className="text-sm font-medium text-foreground">{r.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm tabular-nums text-muted-foreground">{r.time}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${r.type === "in" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                      {r.type === "in" ? "Entrada" : "Saída"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────── AI Section ─────────────── */
function AiSection() {
  return (
    <section id="ia" className="bg-background py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-primary">
              Atendimento com IA
            </span>
            <h2 className="mt-3 text-4xl font-bold text-foreground">
              Chatbot treinado com seu próprio conteúdo
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Carregue manuais, procedimentos e FAQs. A IA responde apenas com base no que você definiu —
              sem alucinações externas, sem desvios de escopo.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "Até 20 documentos por QR Code",
                "Respostas em qualquer idioma (BCP-47)",
                "Histórico de conversa por sessão",
                "Powered by Gemini",
                "Acessível via /ai/[código-do-qr]",
              ].map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm text-foreground">
                  <CheckCircle className="h-4 w-4 shrink-0 text-primary" /> {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Mock chat UI */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3 border-b border-border pb-4">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
                <Brain className="h-4 w-4" />
              </div>
              <div>
                <div className="text-sm font-medium text-foreground">Assistente ZRCODE</div>
                <div className="text-xs text-muted-foreground">Base de conhecimento ativa · 3 documentos</div>
              </div>
              <div className="ml-auto h-2 w-2 rounded-full bg-green-500" />
            </div>
            <div className="space-y-3">
              <div className="flex justify-end">
                <div className="max-w-[80%] rounded-xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground">
                  Qual o procedimento para abertura de válvulas?
                </div>
              </div>
              <div className="flex">
                <div className="max-w-[80%] rounded-xl rounded-bl-sm bg-secondary px-4 py-2.5 text-sm text-foreground">
                  Conforme o Manual de Operação (seção 4.2), as válvulas devem ser abertas somente após confirmação de pressão zero no manômetro principal...
                </div>
              </div>
              <div className="flex justify-end">
                <div className="max-w-[80%] rounded-xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground">
                  E em caso de emergência?
                </div>
              </div>
              <div className="flex">
                <div className="max-w-[80%] rounded-xl rounded-bl-sm bg-secondary px-4 py-2.5 text-sm text-foreground">
                  Para emergências, acione o botão vermelho de parada imediata e siga o POP-07...
                </div>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <div className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
                Digite sua pergunta...
              </div>
              <Button size="sm" className="shrink-0">
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────── Analytics ─────────────── */
const PIXELS = ["GA4", "Google Tag Manager", "Meta Pixel", "TikTok Pixel", "LinkedIn Insight", "X / Twitter", "Pinterest Tag"];

function AnalyticsSection() {
  return (
    <section id="analytics" className="bg-secondary py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-primary">
              Analytics
            </span>
            <h2 className="mt-3 text-4xl font-bold text-foreground">
              Saiba exatamente quem escaneia e quando
            </h2>
            <p className="mt-4 text-muted-foreground">
              30 dias de histórico com segmentação geográfica, por dispositivo e comportamental.
              UTM automático para atribuição perfeita de campanhas.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {[
                { icon: Globe,       label: "País e cidade de origem" },
                { icon: TrendingUp,  label: "Visitantes únicos vs. recorrentes" },
                { icon: BarChart3,   label: "Evolução diária de scans" },
                { icon: Download,    label: "Exportação CSV completa" },
              ].map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3"
                >
                  <Icon className="h-4 w-4 shrink-0 text-primary" />
                  <span className="text-sm text-foreground">{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-3 text-sm font-semibold text-foreground">7 plataformas de tracking suportadas</div>
            <div className="grid grid-cols-2 gap-2">
              {PIXELS.map((name) => (
                <div
                  key={name}
                  className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3"
                >
                  <div className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                  <span className="text-sm text-foreground">{name}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-lg border border-border bg-card p-4">
              <div className="mb-2 text-xs text-muted-foreground">UTM automático em todos os redirecionamentos</div>
              <code className="text-xs text-primary">
                ?utm_source=qr&amp;utm_medium=link&amp;utm_campaign=AbC12
              </code>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────── Use Cases ─────────────── */
const USE_CASES = [
  {
    icon: Factory,
    title: "Indústria & Manutenção",
    style: "bg-[#133249] text-background",
    accent: "text-primary",
    items: [
      "Check-in de técnicos com GPS obrigatório",
      "Formulário de inspeção de equipamentos",
      "Comprovante de visita para auditoria",
      "Acesso restrito à documentação técnica",
      "Webhook para atualizar OS no ERP",
    ],
  },
  {
    icon: Building2,
    title: "Empresas & Facilities",
    style: "bg-primary text-primary-foreground",
    accent: "text-primary-foreground/70",
    items: [
      "Controle de presença em reuniões",
      "Pesquisa de satisfação pós-atendimento",
      "Onboarding digital de colaboradores",
      "Roteamento por turno para comunicados",
      "FAQ automatizado com IA",
    ],
  },
  {
    icon: TrendingUp,
    title: "Marketing & Campanhas",
    style: "bg-card border border-border text-foreground",
    accent: "text-muted-foreground",
    items: [
      "Rastreamento multicanal com 7 pixels",
      "A/B routing por horário ou localização",
      "Link bio para redes sociais",
      "UTM automático em todos os links",
      "Analytics de scans por campanha",
    ],
  },
  {
    icon: Star,
    title: "Eventos & Hospitalidade",
    style: "bg-secondary border border-border text-foreground",
    accent: "text-muted-foreground",
    items: [
      "Check-in certificado de participantes",
      "Cardápio ou guia interativo",
      "Formulário de feedback no encerramento",
      "Wi-Fi compartilhado sem papel",
      "vCard digital para networking",
    ],
  },
];

function UseCasesSection() {
  return (
    <section className="bg-background py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-12 text-center">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">
            Casos de uso
          </span>
          <h2 className="mt-3 text-4xl font-bold text-foreground">Para cada setor, uma solução</h2>
          <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
            Da linha de produção ao marketing digital — a mesma plataforma atende todos os públicos.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {USE_CASES.map(({ icon: Icon, title, style, accent, items }) => (
            <div key={title} className={`rounded-2xl p-6 ${style}`}>
              <Icon className="mb-4 h-6 w-6" />
              <h3 className="mb-4 text-lg font-semibold">{title}</h3>
              <ul className="space-y-2">
                {items.map((item) => (
                  <li key={item} className={`flex items-start gap-2 text-sm ${accent}`}>
                    <CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-60" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────── Pricing Section ─────────────── */

type PricingPlan = {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  price_label: string | null;
  cta_label: string;
  highlighted: boolean;
  sort_order: number;
  price_monthly: number | null;
  price_annual: number | null;
};

type PricingFeature = {
  id: string;
  category: string;
  label: string;
  sort_order: number;
};

type PricingValue = {
  plan_id: string;
  feature_id: string;
  value: string;
  available: boolean;
};

function PricingSection() {
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [features, setFeatures] = useState<PricingFeature[]>([]);
  const [values, setValues] = useState<PricingValue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from("pricing_plans").select("*").order("sort_order"),
      supabase.from("pricing_features").select("*").order("sort_order"),
      supabase.from("pricing_plan_features").select("*"),
    ]).then(([{ data: p }, { data: f }, { data: v }]) => {
      setPlans((p as PricingPlan[]) ?? []);
      setFeatures((f as PricingFeature[]) ?? []);
      setValues((v as PricingValue[]) ?? []);
      setLoading(false);
    });
  }, []);

  const getValue = (planId: string, featureId: string) =>
    values.find((v) => v.plan_id === planId && v.feature_id === featureId);

  const categories = [...new Set(features.map((f) => f.category))];

  return (
    <section id="planos" className="bg-background py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-12 text-center">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">
            Planos
          </span>
          <h2 className="mt-3 text-4xl font-bold text-foreground">
            Escolha o plano ideal para sua operação
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
            Do autônomo à grande indústria — a mesma plataforma, na medida certa para o seu negócio.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16 text-muted-foreground">
            Carregando planos...
          </div>
        ) : (
          <>
            {/* Plan cards */}
            <div className={`grid gap-6 mb-12 ${plans.length === 3 ? "md:grid-cols-3" : "md:grid-cols-2 lg:grid-cols-4"}`}>
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className={`relative flex flex-col rounded-2xl border p-6 ${
                    plan.highlighted
                      ? "border-primary bg-primary text-primary-foreground shadow-lg"
                      : "border-border bg-card text-foreground"
                  }`}
                >
                  {plan.highlighted && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-foreground px-3 py-1 text-xs font-semibold text-background">
                        <Star className="h-3 w-3" /> Mais popular
                      </span>
                    </div>
                  )}
                  <div className="mb-1 text-lg font-bold">{plan.name}</div>
                  <div className={`mb-1 text-2xl font-extrabold ${plan.highlighted ? "text-primary-foreground" : "text-foreground"}`}>
                    {plan.price_monthly
                      ? <>
                          {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(plan.price_monthly / 100)}
                          <span className={`text-sm font-normal ${plan.highlighted ? "text-primary-foreground/70" : "text-muted-foreground"}`}>/mês</span>
                        </>
                      : plan.price_label
                      ? plan.price_label
                      : <span className="text-base font-medium">Sob consulta</span>
                    }
                  </div>
                  {plan.price_annual != null && plan.price_monthly != null && (
                    <div className={`mb-3 text-xs ${plan.highlighted ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                      ou {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(plan.price_annual / 100)}/ano
                      {" · economia de "}{Math.round((1 - plan.price_annual / (plan.price_monthly * 12)) * 100)}%
                    </div>
                  )}
                  <p className={`mb-6 text-sm flex-1 ${plan.highlighted ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                    {plan.tagline}
                  </p>
                  <a href={plan.price_monthly != null || plan.price_annual != null ? `/checkout/${plan.slug}` : "#entrar"}>
                    <Button
                      className="w-full"
                      variant={plan.highlighted ? "secondary" : "default"}
                    >
                      {plan.cta_label}
                    </Button>
                  </a>
                </div>
              ))}
            </div>

            {/* Comparison table */}
            {features.length > 0 && (
              <div className="overflow-x-auto rounded-2xl border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-secondary/50">
                      <th className="px-5 py-4 text-left font-medium text-muted-foreground min-w-52">
                        Funcionalidade
                      </th>
                      {plans.map((plan) => (
                        <th
                          key={plan.id}
                          className={`px-5 py-4 text-center font-semibold min-w-32 ${
                            plan.highlighted ? "text-primary" : "text-foreground"
                          }`}
                        >
                          {plan.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((cat) => (
                      <>
                        <tr key={`cat-${cat}`}>
                          <td
                            colSpan={plans.length + 1}
                            className="bg-secondary/30 px-5 py-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground"
                          >
                            {cat}
                          </td>
                        </tr>
                        {features
                          .filter((f) => f.category === cat)
                          .map((feat, i, arr) => (
                            <tr
                              key={feat.id}
                              className={`border-t border-border ${i === arr.length - 1 ? "" : ""}`}
                            >
                              <td className="px-5 py-3.5 text-foreground">{feat.label}</td>
                              {plans.map((plan) => {
                                const cell = getValue(plan.id, feat.id);
                                return (
                                  <td key={plan.id} className={`px-5 py-3.5 text-center ${plan.highlighted ? "bg-primary/3" : ""}`}>
                                    <PricingCellDisplay cell={cell} />
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                      </>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-border bg-secondary/20">
                      <td className="px-5 py-4" />
                      {plans.map((plan) => (
                        <td key={plan.id} className="px-5 py-4 text-center">
                          <a href={plan.price_monthly != null || plan.price_annual != null ? `/checkout/${plan.slug}` : "#entrar"}>
                            <Button
                              size="sm"
                              variant={plan.highlighted ? "default" : "outline"}
                              className="w-full max-w-36"
                            >
                              {plan.cta_label}
                            </Button>
                          </a>
                        </td>
                      ))}
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

function PricingCellDisplay({ cell }: { cell?: PricingValue }) {
  if (!cell) return <span className="text-muted-foreground/40">—</span>;
  if (cell.value === "Sim") return <Check className="mx-auto h-4 w-4 text-primary" />;
  if (cell.value === "Não" || !cell.available) return <X className="mx-auto h-4 w-4 text-muted-foreground/30" />;
  return <span className="text-foreground font-medium">{cell.value}</span>;
}

/* ─────────────── Auth / CTA Section ─────────────── */
function AuthSection() {
  return (
    <section id="entrar" className="bg-[#133249] py-20 text-background">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <h2 className="text-4xl font-bold">Comece agora, grátis</h2>
            <p className="mt-4 text-lg text-background/60">
              Crie sua conta e automatize suas operações em minutos. Sem cartão de crédito.
            </p>
            <ul className="mt-8 space-y-4">
              {[
                "QR Codes dinâmicos ilimitados",
                "Flow Builder com 4 tipos de blocos",
                "Analytics com 7 integrações de pixel",
                "Prova de presença com certificado HMAC",
                "IA com base de conhecimento própria",
                "Criação em lote via CSV",
              ].map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 shrink-0 text-primary" />
                  <span className="text-background/80">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <Card className="p-6 shadow-lg">
            <AuthForm />
          </Card>
        </div>
      </div>
    </section>
  );
}

/* ─────────────── Footer ─────────────── */
export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#133249] py-8 text-background">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-6 md:flex-row md:justify-between">
        <div className="flex items-center gap-2">
          <img src="/logo.svg" alt="ZRCODE" className="h-6" />
        </div>
        <p className="text-sm text-background/30">© 2026 ZRCODE. Todos os direitos reservados.</p>
        <div className="flex gap-4 text-sm text-background/30">
          <Link to="/privacidade" className="transition-colors hover:text-background/60">Privacidade</Link>
          <Link to="/termos" className="transition-colors hover:text-background/60">Termos</Link>
        </div>
      </div>
    </footer>
  );
}
