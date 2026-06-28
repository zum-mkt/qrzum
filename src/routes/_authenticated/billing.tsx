import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, CreditCard, AlertCircle, XCircle, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/_authenticated/billing")({
  component: BillingPage,
});

type Subscription = {
  id: string;
  period: "monthly" | "annual";
  status: "pending" | "authorized" | "paused" | "cancelled";
  mp_payer_email: string | null;
  current_period_end: string | null;
  created_at: string;
  plan: { id: string; name: string; slug: string };
};

function formatBRL(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR");
}

const STATUS_MAP: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  authorized: { label: "Ativa",     color: "bg-green-500/10 text-green-700 border-green-500/30", icon: CheckCircle },
  pending:    { label: "Pendente",  color: "bg-yellow-500/10 text-yellow-700 border-yellow-500/30", icon: AlertCircle },
  paused:     { label: "Pausada",   color: "bg-orange-500/10 text-orange-700 border-orange-500/30", icon: AlertCircle },
  cancelled:  { label: "Cancelada", color: "bg-red-500/10 text-red-700 border-red-500/30", icon: XCircle },
};

export default function BillingPage() {
  const [subscription, setSubscription] = useState<Subscription | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { setLoading(false); return; }
      const res = await fetch("/api/mp/subscription", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      setSubscription(data.subscription ?? null);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        Carregando...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Assinatura</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gerencie seu plano e histórico de pagamentos.
        </p>
      </div>

      {/* Current subscription */}
      {subscription ? (
        <SubscriptionCard subscription={subscription} />
      ) : (
        <NoSubscriptionCard />
      )}
    </div>
  );
}

function SubscriptionCard({ subscription }: { subscription: Subscription }) {
  const status = STATUS_MAP[subscription.status] ?? STATUS_MAP.pending;
  const StatusIcon = status.icon;
  const periodLabel = subscription.period === "annual" ? "Anual" : "Mensal";

  return (
    <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-lg font-bold text-foreground">{subscription.plan.name}</span>
            <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${status.color}`}>
              <StatusIcon className="h-3 w-3" /> {status.label}
            </span>
            <Badge variant="outline">{periodLabel}</Badge>
          </div>
          {subscription.mp_payer_email && (
            <p className="mt-1 text-sm text-muted-foreground">
              Cobrado em <strong>{subscription.mp_payer_email}</strong>
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Link to={`/checkout/${subscription.plan.slug}`}>
            <Button variant="outline" size="sm">
              <CreditCard className="mr-1.5 h-3.5 w-3.5" /> Trocar plano
            </Button>
          </Link>
          <a
            href="https://www.mercadopago.com.br/subscriptions"
            target="_blank"
            rel="noreferrer"
          >
            <Button variant="ghost" size="sm">
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Gerenciar no MP
            </Button>
          </a>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3 border-t border-border pt-4">
        <Stat label="Plano" value={subscription.plan.name} />
        <Stat label="Período" value={periodLabel} />
        <Stat
          label={subscription.status === "cancelled" ? "Cancelado em" : "Próxima cobrança"}
          value={formatDate(subscription.current_period_end)}
        />
      </div>

      {subscription.status === "authorized" && (
        <div className="rounded-lg bg-secondary/50 p-3 text-xs text-muted-foreground">
          Para cancelar sua assinatura acesse o painel do Mercado Pago em{" "}
          <a
            href="https://www.mercadopago.com.br/subscriptions"
            target="_blank"
            rel="noreferrer"
            className="text-primary underline"
          >
            mercadopago.com.br/subscriptions
          </a>
          .
        </div>
      )}
    </div>
  );
}

function NoSubscriptionCard() {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
      <CreditCard className="mx-auto mb-4 h-10 w-10 text-muted-foreground/40" />
      <h2 className="text-lg font-semibold text-foreground">Nenhuma assinatura ativa</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Escolha um plano para desbloquear todas as funcionalidades da plataforma.
      </p>
      <Link to="/plans">
        <Button className="mt-6">Ver planos</Button>
      </Link>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-medium text-foreground">{value}</div>
    </div>
  );
}
