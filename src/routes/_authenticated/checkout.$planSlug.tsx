import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle, Lock, ShieldCheck, ArrowLeft, Star } from "lucide-react";

export const Route = createFileRoute("/_authenticated/checkout/$planSlug")({
  component: CheckoutPage,
});

type Plan = {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  price_monthly: number | null;
  price_annual: number | null;
  highlighted: boolean;
};

declare global {
  interface Window {
    MercadoPago: new (publicKey: string, options: { locale: string }) => MercadoPagoInstance;
  }
}

interface MercadoPagoInstance {
  cardForm: (options: object) => { getCardFormData: () => CardFormData; unmount: () => void };
}

interface CardFormData {
  token: string;
  issuer_id: string;
  payment_method_id: string;
  transaction_amount: number;
  installments: number;
  payer: { email: string; identification: { type: string; number: string } };
}

function formatBRL(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

function CheckoutPage() {
  const { planSlug } = Route.useParams();
  const navigate = useNavigate();

  const [plan, setPlan] = useState<Plan | null>(null);
  const [period, setPeriod] = useState<"monthly" | "annual">("monthly");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [mpReady, setMpReady] = useState(false);

  const cardFormRef = useRef<{ getCardFormData: () => CardFormData; unmount: () => void } | null>(null);
  const mpRef = useRef<MercadoPagoInstance | null>(null);

  // Load plan
  useEffect(() => {
    supabase
      .from("pricing_plans")
      .select("id, name, slug, tagline, price_monthly, price_annual, highlighted")
      .eq("slug", planSlug)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) navigate({ to: "/dashboard" });
        else setPlan(data as Plan);
        setLoading(false);
      });
  }, [planSlug, navigate]);

  // Load MP SDK and init cardform
  useEffect(() => {
    if (!plan) return;
    const publicKey = import.meta.env.VITE_MP_PUBLIC_KEY;
    if (!publicKey) {
      toast.error("Chave pública do Mercado Pago não configurada.");
      return;
    }

    const price = period === "annual" ? plan.price_annual : plan.price_monthly;
    if (!price) return;
    const amountStr = (price / 100).toFixed(2);

    let scriptEl: HTMLScriptElement | null = null;

    function initCardForm() {
      if (!window.MercadoPago) return;
      if (cardFormRef.current) { cardFormRef.current.unmount(); cardFormRef.current = null; }

      const mp = new window.MercadoPago(publicKey, { locale: "pt-BR" });
      mpRef.current = mp;

      cardFormRef.current = mp.cardForm({
        amount: amountStr,
        iframe: true,
        form: {
          id: "mp-card-form",
          cardNumber: { id: "mp-card-number", placeholder: "Número do cartão" },
          expirationDate: { id: "mp-expiration-date", placeholder: "MM/AAAA" },
          securityCode: { id: "mp-security-code", placeholder: "CVV" },
          cardholderName: { id: "mp-cardholder-name", placeholder: "Nome como no cartão" },
          issuer: { id: "mp-issuer", placeholder: "Banco emissor" },
          installments: { id: "mp-installments", placeholder: "Parcelas" },
          identificationType: { id: "mp-identification-type" },
          identificationNumber: { id: "mp-identification-number", placeholder: "CPF" },
        },
        callbacks: {
          onFormMounted: (err: Error | null) => {
            if (err) console.warn("[MP] cardform error:", err);
            else setMpReady(true);
          },
        },
      });
    }

    if (window.MercadoPago) {
      initCardForm();
    } else {
      scriptEl = document.createElement("script");
      scriptEl.src = "https://sdk.mercadopago.com/js/v2";
      scriptEl.async = true;
      scriptEl.onload = initCardForm;
      document.head.appendChild(scriptEl);
    }

    return () => {
      if (cardFormRef.current) { cardFormRef.current.unmount(); cardFormRef.current = null; }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan, period]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardFormRef.current || !plan) return;
    setSubmitting(true);

    try {
      const formData = cardFormRef.current.getCardFormData();
      if (!formData.token) {
        toast.error("Não foi possível tokenizar o cartão. Verifique os dados.");
        setSubmitting(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate({ to: "/" }); return; }

      const payer = formData.payer;

      const res = await fetch("/api/mp/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          plan_id: plan.id,
          period,
          card_token: formData.token,
          payer_email: payer.email || session.user.email,
          payer_name: (document.getElementById("mp-cardholder-name") as HTMLInputElement)?.value || "",
          cpf: payer.identification?.number || "",
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        toast.error(result.error || "Erro ao processar pagamento.");
        setSubmitting(false);
        return;
      }

      setSuccess(true);
      toast.success("Assinatura ativada com sucesso!");
    } catch {
      toast.error("Erro de conexão. Tente novamente.");
      setSubmitting(false);
    }
  };

  if (loading) return null;
  if (!plan) return null;

  const price = period === "annual" ? plan.price_annual : plan.price_monthly;
  const annualPrice = plan.price_annual;
  const monthlyPrice = plan.price_monthly;
  const annualDiscount =
    monthlyPrice && annualPrice
      ? Math.round((1 - annualPrice / (monthlyPrice * 12)) * 100)
      : 0;

  if (success) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <div className="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-full bg-primary/10">
          <CheckCircle className="h-10 w-10 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Assinatura ativada!</h1>
        <p className="mt-3 text-muted-foreground">
          Seu plano <strong>{plan.name}</strong> está ativo. Aproveite todos os recursos.
        </p>
        <Button className="mt-8 w-full" onClick={() => navigate({ to: "/dashboard" })}>
          Ir para o dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <button
        type="button"
        onClick={() => navigate({ to: "/dashboard" })}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar
      </button>

      <div className="grid gap-6 md:grid-cols-[1fr_280px]">
        {/* Card form */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <h1 className="mb-6 text-xl font-bold text-foreground">Dados de pagamento</h1>

          {/* Period toggle */}
          {monthlyPrice && annualPrice && (
            <div className="mb-6 flex gap-2">
              <button
                type="button"
                onClick={() => setPeriod("monthly")}
                className={`flex-1 rounded-lg border py-2.5 text-sm font-medium transition-colors ${
                  period === "monthly"
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:border-primary/50"
                }`}
              >
                Mensal
              </button>
              <button
                type="button"
                onClick={() => setPeriod("annual")}
                className={`relative flex-1 rounded-lg border py-2.5 text-sm font-medium transition-colors ${
                  period === "annual"
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:border-primary/50"
                }`}
              >
                Anual
                {annualDiscount > 0 && (
                  <span className="absolute -top-2 -right-1 rounded-full bg-green-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    -{annualDiscount}%
                  </span>
                )}
              </button>
            </div>
          )}

          <form id="mp-card-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="mp-card-number">Número do cartão</Label>
              <div id="mp-card-number" className="mp-iframe h-10 rounded-md border border-input bg-background px-3 py-2" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="mp-expiration-date">Validade</Label>
                <div id="mp-expiration-date" className="mp-iframe h-10 rounded-md border border-input bg-background px-3 py-2" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mp-security-code">CVV</Label>
                <div id="mp-security-code" className="mp-iframe h-10 rounded-md border border-input bg-background px-3 py-2" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mp-cardholder-name">Nome no cartão</Label>
              <div id="mp-cardholder-name" className="mp-iframe h-10 rounded-md border border-input bg-background px-3 py-2" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de documento</Label>
                <div id="mp-identification-type" className="mp-iframe h-10 rounded-md border border-input bg-background px-3 py-2" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mp-identification-number">CPF</Label>
                <div id="mp-identification-number" className="mp-iframe h-10 rounded-md border border-input bg-background px-3 py-2" />
              </div>
            </div>

            <div className="hidden">
              <div id="mp-issuer" />
              <div id="mp-installments" />
            </div>

            <div className="pt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <Lock className="h-3.5 w-3.5" />
              Seus dados são criptografados pelo Mercado Pago
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={!mpReady || submitting || !price}
            >
              {submitting
                ? "Processando..."
                : price
                ? `Assinar por ${formatBRL(price)}/${period === "annual" ? "ano" : "mês"}`
                : "Preço não configurado"}
            </Button>
          </form>
        </div>

        {/* Plan summary */}
        <div className="space-y-4">
          <div
            className={`rounded-2xl border p-5 ${
              plan.highlighted ? "border-primary bg-primary/5" : "border-border bg-card"
            }`}
          >
            {plan.highlighted && (
              <div className="mb-3 flex items-center gap-1 text-xs font-semibold text-primary">
                <Star className="h-3 w-3" /> Mais popular
              </div>
            )}
            <div className="font-bold text-foreground">{plan.name}</div>
            <div className="mt-1 text-2xl font-extrabold text-foreground">
              {price ? formatBRL(price) : "—"}
              <span className="text-sm font-normal text-muted-foreground">
                /{period === "annual" ? "ano" : "mês"}
              </span>
            </div>
            {period === "annual" && monthlyPrice && annualPrice && (
              <div className="mt-1 text-xs text-green-600">
                Equivale a {formatBRL(Math.round(annualPrice / 12))}/mês
                {" "}(economia de {formatBRL(monthlyPrice * 12 - annualPrice)}/ano)
              </div>
            )}
            <p className="mt-3 text-sm text-muted-foreground">{plan.tagline}</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <span className="text-foreground font-medium">Pagamento seguro</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Processado pelo Mercado Pago. Cancele a qualquer momento sem multa.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
