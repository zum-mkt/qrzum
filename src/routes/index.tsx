import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  QrCode, MapPin, Lock, FileText, MessageSquare, Shield, Brain,
  BarChart3, CheckCircle, ArrowRight, Building2, Factory, Users,
  Globe, Clock, Download, TrendingUp, RefreshCw, Wifi, Phone,
  Layers, Zap, Star, Workflow, Link2, ChevronRight,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "zum — Automatize operações com QR Codes inteligentes" },
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
      <AiSection />
      <AnalyticsSection />
      <UseCasesSection />
      <AuthSection />
      <Footer />
    </div>
  );
}

/* ─────────────── Navigation ─────────────── */
function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <a href="#">
          <img src="/logo.svg" alt="zum" className="h-8" />
        </a>
        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          <a href="#fluxo" className="transition-colors hover:text-foreground">Fluxo Operacional</a>
          <a href="#presenca" className="transition-colors hover:text-foreground">Presença Certificada</a>
          <a href="#ia" className="transition-colors hover:text-foreground">IA</a>
          <a href="#analytics" className="transition-colors hover:text-foreground">Analytics</a>
        </nav>
        <div className="flex gap-2">
          <a href="#entrar">
            <Button variant="outline" size="sm">Entrar</Button>
          </a>
          <a href="#entrar">
            <Button size="sm" className="hidden sm:inline-flex">Criar conta grátis</Button>
          </a>
        </div>
      </div>
    </header>
  );
}

/* ─────────────── Hero ─────────────── */
function Hero() {
  return (
    <section className="relative overflow-hidden bg-foreground py-24 text-background lg:py-36">
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 30px 30px, currentColor 1.5px, transparent 0)",
          backgroundSize: "60px 60px",
        }}
      />
      <div className="relative mx-auto max-w-6xl px-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          <Zap className="h-3 w-3" /> Automação empresarial e industrial
        </div>
        <h1 className="mt-6 max-w-4xl text-5xl font-bold leading-tight tracking-tight sm:text-6xl lg:text-7xl">
          QR Codes que{" "}
          <span className="text-primary">automatizam</span>{" "}
          sua operação
        </h1>
        <p className="mt-6 max-w-2xl text-xl text-background/60">
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
              className="gap-2 border-background/20 text-background hover:bg-background/10"
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
    <section id="fluxo" className="bg-foreground py-20 text-background">
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
];

function QrTypesSection() {
  return (
    <section className="bg-background py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-12 text-center">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">
            9 formatos
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
          <div className="rounded-2xl bg-foreground p-8 text-background">
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
                <div className="text-sm font-medium text-foreground">Assistente zum</div>
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
    style: "bg-foreground text-background",
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

/* ─────────────── Auth / CTA Section ─────────────── */
function AuthSection() {
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
    <section id="entrar" className="bg-foreground py-20 text-background">
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
            <Tabs defaultValue="signup" className="w-full">
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
          </Card>
        </div>
      </div>
    </section>
  );
}

/* ─────────────── Footer ─────────────── */
function Footer() {
  return (
    <footer className="border-t border-background/10 bg-foreground py-8 text-background">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-6 md:flex-row md:justify-between">
        <div className="flex items-center gap-2">
          <img src="/logo.svg" alt="zum" className="h-6" />
        </div>
        <p className="text-sm text-background/30">© 2026 zum. Todos os direitos reservados.</p>
        <div className="flex gap-4 text-sm text-background/30">
          <a href="#" className="transition-colors hover:text-background/60">Privacidade</a>
          <a href="#" className="transition-colors hover:text-background/60">Termos</a>
        </div>
      </div>
    </footer>
  );
}

/* ─────────────── Shared ─────────────── */
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
