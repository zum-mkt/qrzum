import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Plus, Pencil, Trash2, GripVertical, Star, Check, X,
  ChevronUp, ChevronDown,
} from "lucide-react";

const ADMIN_EMAIL = "zum@agenciazum.com.br";

export const Route = createFileRoute("/_authenticated/admin/plans")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user?.email !== ADMIN_EMAIL) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: AdminPlansPage,
});

/* ─── Types ─────────────────────────────────────────────────────────────── */

type Plan = {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  price_label: string | null;
  cta_label: string;
  highlighted: boolean;
  sort_order: number;
};

type Feature = {
  id: string;
  category: string;
  label: string;
  sort_order: number;
};

type PlanFeatureValue = {
  plan_id: string;
  feature_id: string;
  value: string;
  available: boolean;
};

/* ─── Main component ────────────────────────────────────────────────────── */

function AdminPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [values, setValues] = useState<PlanFeatureValue[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: p }, { data: f }, { data: v }] = await Promise.all([
      supabase.from("pricing_plans").select("*").order("sort_order"),
      supabase.from("pricing_features").select("*").order("sort_order"),
      supabase.from("pricing_plan_features").select("*"),
    ]);
    setPlans((p as Plan[]) ?? []);
    setFeatures((f as Feature[]) ?? []);
    setValues((v as PlanFeatureValue[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

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
        <h1 className="text-2xl font-bold text-foreground">Gerenciar Planos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Edite os planos e funcionalidades exibidos na landing page.
        </p>
      </div>

      <Tabs defaultValue="plans">
        <TabsList>
          <TabsTrigger value="plans">Planos</TabsTrigger>
          <TabsTrigger value="features">Funcionalidades</TabsTrigger>
          <TabsTrigger value="matrix">Tabela Comparativa</TabsTrigger>
        </TabsList>

        <TabsContent value="plans" className="mt-4">
          <PlansTab plans={plans} onRefresh={load} />
        </TabsContent>

        <TabsContent value="features" className="mt-4">
          <FeaturesTab features={features} onRefresh={load} />
        </TabsContent>

        <TabsContent value="matrix" className="mt-4">
          <MatrixTab plans={plans} features={features} values={values} onRefresh={load} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ─── Plans Tab ─────────────────────────────────────────────────────────── */

function PlansTab({ plans, onRefresh }: { plans: Plan[]; onRefresh: () => void }) {
  const [editing, setEditing] = useState<Plan | null>(null);
  const [adding, setAdding] = useState(false);

  const blank: Plan = {
    id: "", name: "", slug: "", tagline: "", price_label: null,
    cta_label: "Falar com vendas", highlighted: false, sort_order: plans.length + 1,
  };

  const save = async (plan: Plan) => {
    const { id, ...data } = plan;
    if (id) {
      const { error } = await supabase.from("pricing_plans").update(data).eq("id", id);
      if (error) return toast.error(error.message);
      toast.success("Plano atualizado");
    } else {
      const { error } = await supabase.from("pricing_plans").insert(data);
      if (error) return toast.error(error.message);
      toast.success("Plano criado");
    }
    setEditing(null);
    setAdding(false);
    onRefresh();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("pricing_plans").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Plano removido");
    onRefresh();
  };

  const moveOrder = async (plan: Plan, dir: -1 | 1) => {
    const sibling = plans.find((p) => p.sort_order === plan.sort_order + dir);
    if (!sibling) return;
    await Promise.all([
      supabase.from("pricing_plans").update({ sort_order: sibling.sort_order }).eq("id", plan.id),
      supabase.from("pricing_plans").update({ sort_order: plan.sort_order }).eq("id", sibling.id),
    ]);
    onRefresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setAdding(true)}>
          <Plus className="mr-2 h-4 w-4" /> Novo Plano
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`relative rounded-xl border p-5 ${
              plan.highlighted
                ? "border-primary bg-primary/5"
                : "border-border bg-card"
            }`}
          >
            {plan.highlighted && (
              <Badge className="absolute -top-2.5 left-4">
                <Star className="mr-1 h-3 w-3" /> Destaque
              </Badge>
            )}
            <div className="mb-1 flex items-start justify-between gap-2">
              <div>
                <div className="font-semibold text-foreground">{plan.name}</div>
                <div className="text-xs text-muted-foreground">/{plan.slug}</div>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => moveOrder(plan, -1)}
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => moveOrder(plan, 1)}
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{plan.tagline}</p>
            <div className="mt-3 flex items-center gap-2">
              <Badge variant="outline">{plan.price_label ?? "Sob consulta"}</Badge>
              <span className="text-xs text-muted-foreground">{plan.cta_label}</span>
            </div>
            <div className="mt-4 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => setEditing(plan)}
              >
                <Pencil className="mr-1.5 h-3.5 w-3.5" /> Editar
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 text-destructive hover:bg-destructive/10"
                onClick={() => remove(plan.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <PlanDialog
        open={adding || editing !== null}
        plan={editing ?? blank}
        onSave={save}
        onClose={() => { setEditing(null); setAdding(false); }}
      />
    </div>
  );
}

function PlanDialog({
  open, plan, onSave, onClose,
}: {
  open: boolean;
  plan: Plan;
  onSave: (p: Plan) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Plan>(plan);
  useEffect(() => setForm(plan), [plan]);

  const set = <K extends keyof Plan>(k: K, v: Plan[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{form.id ? "Editar Plano" : "Novo Plano"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <Field label="Nome" value={form.name} onChange={(v) => set("name", v)} />
          <Field
            label="Slug (identificador único)"
            value={form.slug}
            onChange={(v) => set("slug", v.toLowerCase().replace(/\s+/g, "-"))}
          />
          <Field label="Público-alvo (tagline)" value={form.tagline} onChange={(v) => set("tagline", v)} />
          <Field
            label="Preço (ex: R$ 99/mês, Grátis — deixe vazio para 'Sob consulta')"
            value={form.price_label ?? ""}
            onChange={(v) => set("price_label", v || null)}
          />
          <Field label="Texto do botão CTA" value={form.cta_label} onChange={(v) => set("cta_label", v)} />
          <Field
            label="Ordem de exibição"
            type="number"
            value={String(form.sort_order)}
            onChange={(v) => set("sort_order", Number(v))}
          />
          <div className="flex items-center gap-3">
            <Switch
              checked={form.highlighted}
              onCheckedChange={(v) => set("highlighted", v)}
            />
            <Label>Plano em destaque</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => onSave(form)}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Features Tab ──────────────────────────────────────────────────────── */

function FeaturesTab({
  features,
  onRefresh,
}: {
  features: Feature[];
  onRefresh: () => void;
}) {
  const [editing, setEditing] = useState<Feature | null>(null);
  const [adding, setAdding] = useState(false);

  const blank: Feature = {
    id: "", category: "", label: "", sort_order: features.length + 1,
  };

  const save = async (feat: Feature) => {
    const { id, ...data } = feat;
    if (id) {
      const { error } = await supabase.from("pricing_features").update(data).eq("id", id);
      if (error) return toast.error(error.message);
      toast.success("Funcionalidade atualizada");
    } else {
      const { error } = await supabase.from("pricing_features").insert(data);
      if (error) return toast.error(error.message);
      toast.success("Funcionalidade criada");
    }
    setEditing(null);
    setAdding(false);
    onRefresh();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("pricing_features").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Funcionalidade removida");
    onRefresh();
  };

  const moveOrder = async (feat: Feature, dir: -1 | 1) => {
    const sibling = features.find((f) => f.sort_order === feat.sort_order + dir);
    if (!sibling) return;
    await Promise.all([
      supabase.from("pricing_features").update({ sort_order: sibling.sort_order }).eq("id", feat.id),
      supabase.from("pricing_features").update({ sort_order: feat.sort_order }).eq("id", sibling.id),
    ]);
    onRefresh();
  };

  const categories = [...new Set(features.map((f) => f.category))];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setAdding(true)}>
          <Plus className="mr-2 h-4 w-4" /> Nova Funcionalidade
        </Button>
      </div>

      {categories.map((cat) => (
        <div key={cat} className="rounded-xl border border-border">
          <div className="border-b border-border bg-secondary/50 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {cat || "Sem categoria"}
          </div>
          {features
            .filter((f) => f.category === cat)
            .map((feat) => (
              <div
                key={feat.id}
                className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-0"
              >
                <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                <span className="flex-1 text-sm text-foreground">{feat.label}</span>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveOrder(feat, -1)}>
                    <ChevronUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveOrder(feat, 1)}>
                    <ChevronDown className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditing(feat)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    onClick={() => remove(feat.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
        </div>
      ))}

      <FeatureDialog
        open={adding || editing !== null}
        feature={editing ?? blank}
        existingCategories={categories}
        onSave={save}
        onClose={() => { setEditing(null); setAdding(false); }}
      />
    </div>
  );
}

function FeatureDialog({
  open, feature, existingCategories, onSave, onClose,
}: {
  open: boolean;
  feature: Feature;
  existingCategories: string[];
  onSave: (f: Feature) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Feature>(feature);
  useEffect(() => setForm(feature), [feature]);

  const set = <K extends keyof Feature>(k: K, v: Feature[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{form.id ? "Editar Funcionalidade" : "Nova Funcionalidade"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="space-y-2">
            <Label>Categoria</Label>
            <Input
              value={form.category}
              onChange={(e) => set("category", e.target.value)}
              list="categories-list"
              placeholder="Ex: Analytics, QR Codes..."
            />
            <datalist id="categories-list">
              {existingCategories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
          <Field label="Nome da funcionalidade" value={form.label} onChange={(v) => set("label", v)} />
          <Field
            label="Ordem"
            type="number"
            value={String(form.sort_order)}
            onChange={(v) => set("sort_order", Number(v))}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => onSave(form)}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Matrix Tab ────────────────────────────────────────────────────────── */

function MatrixTab({
  plans,
  features,
  values,
  onRefresh,
}: {
  plans: Plan[];
  features: Feature[];
  values: PlanFeatureValue[];
  onRefresh: () => void;
}) {
  const [editingCell, setEditingCell] = useState<{ planId: string; featureId: string } | null>(null);

  const getValue = (planId: string, featureId: string) =>
    values.find((v) => v.plan_id === planId && v.feature_id === featureId);

  const upsertValue = async (planId: string, featureId: string, value: string, available: boolean) => {
    const { error } = await supabase.from("pricing_plan_features").upsert(
      { plan_id: planId, feature_id: featureId, value, available },
      { onConflict: "plan_id,feature_id" },
    );
    if (error) return toast.error(error.message);
    toast.success("Valor salvo");
    setEditingCell(null);
    onRefresh();
  };

  const categories = [...new Set(features.map((f) => f.category))];

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-secondary/50">
            <th className="px-4 py-3 text-left font-medium text-muted-foreground w-64">
              Funcionalidade
            </th>
            {plans.map((plan) => (
              <th
                key={plan.id}
                className={`px-4 py-3 text-center font-semibold ${
                  plan.highlighted ? "text-primary" : "text-foreground"
                }`}
              >
                {plan.name}
                {plan.highlighted && (
                  <Star className="ml-1 inline h-3 w-3 text-primary" />
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {categories.map((cat) => (
            <>
              <tr key={`cat-${cat}`} className="bg-muted/30">
                <td
                  colSpan={plans.length + 1}
                  className="px-4 py-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground"
                >
                  {cat}
                </td>
              </tr>
              {features
                .filter((f) => f.category === cat)
                .map((feat) => (
                  <tr key={feat.id} className="border-t border-border hover:bg-secondary/30">
                    <td className="px-4 py-3 text-foreground">{feat.label}</td>
                    {plans.map((plan) => {
                      const cell = getValue(plan.id, feat.id);
                      const isEditing =
                        editingCell?.planId === plan.id &&
                        editingCell?.featureId === feat.id;
                      return (
                        <td key={plan.id} className="px-4 py-3 text-center">
                          {isEditing ? (
                            <CellEditor
                              initial={cell}
                              onSave={(v, a) => upsertValue(plan.id, feat.id, v, a)}
                              onCancel={() => setEditingCell(null)}
                            />
                          ) : (
                            <button
                              type="button"
                              className="group relative inline-flex items-center gap-1 rounded px-2 py-1 hover:bg-secondary"
                              onClick={() =>
                                setEditingCell({ planId: plan.id, featureId: feat.id })
                              }
                            >
                              <CellDisplay cell={cell} />
                              <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
                            </button>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CellDisplay({ cell }: { cell?: PlanFeatureValue }) {
  if (!cell) return <span className="text-muted-foreground">—</span>;
  if (cell.value === "Sim" || (cell.available && cell.value !== "Não")) {
    if (cell.value === "Sim") {
      return <Check className="mx-auto h-4 w-4 text-primary" />;
    }
    return <span className="text-foreground">{cell.value}</span>;
  }
  return <X className="mx-auto h-4 w-4 text-muted-foreground/40" />;
}

function CellEditor({
  initial,
  onSave,
  onCancel,
}: {
  initial?: PlanFeatureValue;
  onSave: (value: string, available: boolean) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initial?.value ?? "");
  const [available, setAvailable] = useState(initial?.available ?? true);

  return (
    <div className="flex flex-col gap-1.5 min-w-36">
      <Input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="h-7 text-xs"
        placeholder="Sim / Não / Até 5..."
        onKeyDown={(e) => {
          if (e.key === "Enter") onSave(value, available);
          if (e.key === "Escape") onCancel();
        }}
      />
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Switch
          checked={available}
          onCheckedChange={setAvailable}
          className="h-4 w-7"
        />
        Disponível
      </div>
      <div className="flex gap-1">
        <Button size="sm" className="h-6 flex-1 text-xs" onClick={() => onSave(value, available)}>
          OK
        </Button>
        <Button size="sm" variant="outline" className="h-6 flex-1 text-xs" onClick={onCancel}>
          ✕
        </Button>
      </div>
    </div>
  );
}

/* ─── Shared ─────────────────────────────────────────────────────────────── */

function Field({
  label, value, onChange, type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
