import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Check, X, Star } from "lucide-react";

export const Route = createFileRoute("/_authenticated/plans")({
  component: PlansPage,
});

type Plan = {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  cta_label: string;
  highlighted: boolean;
  sort_order: number;
  price_monthly: number | null;
  price_annual: number | null;
};

type Feature = {
  id: string;
  category: string;
  label: string;
  sort_order: number;
};

type FeatureValue = {
  plan_id: string;
  feature_id: string;
  value: string;
  available: boolean;
};

function fmtBRL(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [values, setValues] = useState<FeatureValue[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"monthly" | "annual">("monthly");

  useEffect(() => {
    Promise.all([
      supabase.from("pricing_plans").select("*").order("sort_order"),
      supabase.from("pricing_features").select("*").order("sort_order"),
      supabase.from("pricing_plan_features").select("*"),
    ]).then(([{ data: p }, { data: f }, { data: v }]) => {
      setPlans((p as Plan[]) ?? []);
      setFeatures((f as Feature[]) ?? []);
      setValues((v as FeatureValue[]) ?? []);
      setLoading(false);
    });
  }, []);

  const getValue = (planId: string, featureId: string) =>
    values.find((v) => v.plan_id === planId && v.feature_id === featureId);

  const categories = [...new Set(features.map((f) => f.category))];

  const hasAnnual = plans.some((p) => p.price_annual != null);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        Carregando...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-foreground">Escolha seu plano</h1>
        <p className="mt-2 text-muted-foreground">
          Cancele a qualquer momento. Sem fidelidade.
        </p>

        {hasAnnual && (
          <div className="mt-4 inline-flex items-center gap-1 rounded-lg border border-border bg-secondary p-1">
            <button
              type="button"
              onClick={() => setPeriod("monthly")}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                period === "monthly"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Mensal
            </button>
            <button
              type="button"
              onClick={() => setPeriod("annual")}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                period === "annual"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Anual
              <span className="ml-1.5 rounded-full bg-green-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                economize
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Plan cards */}
      <div className={`grid gap-6 ${plans.length === 3 ? "md:grid-cols-3" : "md:grid-cols-2 lg:grid-cols-4"}`}>
        {plans.map((plan) => {
          const price = period === "annual" ? plan.price_annual : plan.price_monthly;
          const monthlyEquiv = period === "annual" && plan.price_annual
            ? Math.round(plan.price_annual / 12)
            : null;
          const discount =
            plan.price_annual && plan.price_monthly
              ? Math.round((1 - plan.price_annual / (plan.price_monthly * 12)) * 100)
              : 0;

          return (
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

              <div className={`mb-1 text-3xl font-extrabold ${plan.highlighted ? "text-primary-foreground" : "text-foreground"}`}>
                {price != null
                  ? <>{fmtBRL(price)}<span className={`text-sm font-normal ${plan.highlighted ? "text-primary-foreground/70" : "text-muted-foreground"}`}>/{period === "annual" ? "ano" : "mês"}</span></>
                  : <span className="text-base font-medium">Sob consulta</span>
                }
              </div>

              {period === "annual" && monthlyEquiv && discount > 0 && (
                <div className={`mb-3 text-xs ${plan.highlighted ? "text-primary-foreground/60" : "text-green-600"}`}>
                  {fmtBRL(monthlyEquiv)}/mês · economia de {discount}%
                </div>
              )}

              <p className={`mb-6 text-sm flex-1 ${plan.highlighted ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                {plan.tagline}
              </p>

              {price != null ? (
                <Link to={`/checkout/${plan.slug}`} search={{ period }}>
                  <Button
                    className="w-full"
                    variant={plan.highlighted ? "secondary" : "default"}
                  >
                    {plan.cta_label}
                  </Button>
                </Link>
              ) : (
                <a href="#entrar">
                  <Button className="w-full" variant={plan.highlighted ? "secondary" : "outline"}>
                    {plan.cta_label}
                  </Button>
                </a>
              )}
            </div>
          );
        })}
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
                    .map((feat) => (
                      <tr key={feat.id} className="border-t border-border hover:bg-secondary/20">
                        <td className="px-5 py-3.5 text-foreground">{feat.label}</td>
                        {plans.map((plan) => {
                          const cell = getValue(plan.id, feat.id);
                          return (
                            <td key={plan.id} className="px-5 py-3.5 text-center">
                              {!cell || cell.value === "Não" || !cell.available
                                ? <X className="mx-auto h-4 w-4 text-muted-foreground/30" />
                                : cell.value === "Sim"
                                ? <Check className="mx-auto h-4 w-4 text-primary" />
                                : <span className="font-medium text-foreground">{cell.value}</span>
                              }
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
                {plans.map((plan) => {
                  const price = period === "annual" ? plan.price_annual : plan.price_monthly;
                  return (
                    <td key={plan.id} className="px-5 py-4 text-center">
                      {price != null ? (
                        <Link to={`/checkout/${plan.slug}`} search={{ period }}>
                          <Button size="sm" variant={plan.highlighted ? "default" : "outline"} className="w-full max-w-36">
                            {plan.cta_label}
                          </Button>
                        </Link>
                      ) : (
                        <Button size="sm" variant="outline" className="w-full max-w-36">
                          {plan.cta_label}
                        </Button>
                      )}
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
