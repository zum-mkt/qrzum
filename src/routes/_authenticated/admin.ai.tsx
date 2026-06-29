import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Save, Bot, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import { AiChatPanel } from "@/components/AiChatPanel";

const ADMIN_EMAIL = "zum@agenciazum.com.br";

export const Route = createFileRoute("/_authenticated/admin/ai")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user?.email !== ADMIN_EMAIL) throw redirect({ to: "/dashboard" });
  },
  component: AdminAiPage,
});

type Agent = {
  id: string;
  slug: string;
  name: string;
  description: string;
  system_prompt: string;
  model: string;
  enabled: boolean;
};

type KnowledgeDoc = {
  id?: string;
  title: string;
  content: string;
  sort_order: number;
  _deleted?: boolean;
};

type OpenRouterModel = {
  id: string;
  name: string;
  context_length: number;
  pricing: { prompt: string; completion: string };
};

function isFree(m: OpenRouterModel) {
  return m.id.endsWith(":free") || (parseFloat(m.pricing?.prompt ?? "1") === 0 && parseFloat(m.pricing?.completion ?? "1") === 0);
}

function ctxLabel(ctx: number) {
  if (!ctx) return "";
  if (ctx >= 1_000_000) return ` · ${(ctx / 1_000_000).toFixed(0)}M ctx`;
  if (ctx >= 1_000) return ` · ${Math.round(ctx / 1_000)}K ctx`;
  return ` · ${ctx} ctx`;
}

async function fetchOpenRouterModels(): Promise<OpenRouterModel[]> {
  const res = await fetch("https://openrouter.ai/api/v1/models");
  if (!res.ok) throw new Error("Falha ao carregar modelos");
  const json = await res.json() as { data: OpenRouterModel[] };
  return json.data ?? [];
}

function AdminAiPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selected, setSelected] = useState<Agent | null>(null);
  const [docs, setDocs] = useState<KnowledgeDoc[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [models, setModels] = useState<OpenRouterModel[]>([]);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [modelSearch, setModelSearch] = useState("");

  const loadModels = async () => {
    setModelsLoading(true);
    try {
      const data = await fetchOpenRouterModels();
      setModels(data.sort((a, b) => {
        const af = isFree(a), bf = isFree(b);
        if (af !== bf) return af ? -1 : 1;
        return a.name.localeCompare(b.name);
      }));
    } catch {
      toast.error("Não foi possível carregar modelos do OpenRouter");
    } finally {
      setModelsLoading(false);
    }
  };

  const filteredModels = useMemo(() => {
    const q = modelSearch.toLowerCase();
    return models.filter(m => !q || m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q));
  }, [models, modelSearch]);

  const freeModels = filteredModels.filter(isFree);
  const paidModels = filteredModels.filter(m => !isFree(m));

  useEffect(() => {
    supabase.from("ai_agents").select("*").order("created_at").then(({ data }) => {
      setAgents((data as Agent[]) ?? []);
      setLoading(false);
    });
    loadModels();
  }, []);

  const selectAgent = async (agent: Agent) => {
    setSelected({ ...agent });
    const { data } = await supabase
      .from("ai_agent_knowledge")
      .select("*")
      .eq("agent_id", agent.id)
      .order("sort_order");
    setDocs((data as KnowledgeDoc[]) ?? []);
  };

  const toggleEnabled = async (agent: Agent) => {
    const updated = { ...agent, enabled: !agent.enabled };
    await supabase.from("ai_agents").update({ enabled: updated.enabled }).eq("id", agent.id);
    setAgents(prev => prev.map(a => a.id === agent.id ? updated : a));
    if (selected?.id === agent.id) setSelected(updated);
    toast.success(updated.enabled ? "Agente ativado" : "Agente desativado");
  };

  const saveAgent = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await supabase.from("ai_agents").update({
        name: selected.name,
        description: selected.description,
        system_prompt: selected.system_prompt,
        model: selected.model,
        updated_at: new Date().toISOString(),
      }).eq("id", selected.id);

      // Save knowledge docs
      const toDelete = docs.filter(d => d._deleted && d.id);
      const toUpsert = docs.filter(d => !d._deleted).map((d, i) => ({
        ...(d.id ? { id: d.id } : {}),
        agent_id: selected.id,
        title: d.title,
        content: d.content,
        sort_order: i,
      }));

      if (toDelete.length > 0) {
        await supabase.from("ai_agent_knowledge").delete().in("id", toDelete.map(d => d.id!));
      }
      if (toUpsert.length > 0) {
        await supabase.from("ai_agent_knowledge").upsert(toUpsert, { onConflict: "id" });
      }

      setAgents(prev => prev.map(a => a.id === selected.id ? selected : a));
      setDocs(prev => prev.filter(d => !d._deleted));
      toast.success("Agente salvo");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const addDoc = () => {
    if (docs.filter(d => !d._deleted).length >= 20) return toast.error("Máximo 20 documentos");
    setDocs(prev => [...prev, { title: "", content: "", sort_order: prev.length }]);
  };

  const updateDoc = (i: number, patch: Partial<KnowledgeDoc>) => {
    setDocs(prev => prev.map((d, idx) => idx === i ? { ...d, ...patch } : d));
  };

  const deleteDoc = (i: number) => {
    setDocs(prev => prev.map((d, idx) => idx === i ? { ...d, _deleted: true } : d));
  };

  const visibleDocs = docs.filter(d => !d._deleted);

  if (loading) return <div className="flex h-64 items-center justify-center text-muted-foreground">Carregando…</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configuração de IAs</h1>
        <p className="mt-1 text-sm text-muted-foreground">Treine e configure os agentes de IA da plataforma.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* Agent list */}
        <div className="space-y-2">
          {agents.map(agent => (
            <button
              key={agent.id}
              onClick={() => selectAgent(agent)}
              className={`w-full rounded-xl border p-4 text-left transition-all ${
                selected?.id === agent.id
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card hover:border-primary/40"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span className="text-sm font-semibold text-foreground">{agent.name}</span>
                </div>
                <Badge variant={agent.enabled ? "default" : "secondary"} className="text-[10px]">
                  {agent.enabled ? "Ativo" : "Inativo"}
                </Badge>
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2 pl-6">{agent.description}</p>
            </button>
          ))}
        </div>

        {/* Agent editor */}
        {selected ? (
          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">{selected.name}</h2>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Switch
                    checked={selected.enabled}
                    onCheckedChange={() => toggleEnabled(selected)}
                  />
                  {selected.enabled ? "Ativo" : "Inativo"}
                </div>
                <Button onClick={saveAgent} disabled={saving} size="sm">
                  <Save className="mr-1.5 h-3.5 w-3.5" />
                  {saving ? "Salvando…" : "Salvar"}
                </Button>
              </div>
            </div>

            <Tabs defaultValue="config">
              <TabsList className="mb-4">
                <TabsTrigger value="config">Configuração</TabsTrigger>
                <TabsTrigger value="knowledge">Base de Conhecimento</TabsTrigger>
                <TabsTrigger value="test">Testar</TabsTrigger>
              </TabsList>

              <TabsContent value="config" className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Nome</Label>
                  <Input value={selected.name} onChange={e => setSelected({ ...selected, name: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Descrição</Label>
                  <Input value={selected.description} onChange={e => setSelected({ ...selected, description: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label>Modelo</Label>
                    <button
                      type="button"
                      onClick={loadModels}
                      disabled={modelsLoading}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <RefreshCw className={`h-3 w-3 ${modelsLoading ? "animate-spin" : ""}`} />
                      {modelsLoading ? "Carregando…" : "Atualizar lista"}
                    </button>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                    <Input
                      placeholder="Buscar modelo…"
                      value={modelSearch}
                      onChange={e => setModelSearch(e.target.value)}
                      className="pl-8 h-8 text-xs mb-1.5"
                    />
                  </div>
                  {/* warn when saved model is not in the current API list */}
                  {!modelsLoading && selected.model && !models.find(m => m.id === selected.model) && (
                    <div className="flex items-center gap-1.5 rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive mb-1">
                      <span>⚠️</span>
                      <span>O modelo atual <strong>{selected.model}</strong> não está mais disponível no OpenRouter. Selecione outro abaixo e salve.</span>
                    </div>
                  )}
                  <select
                    value={selected.model}
                    onChange={e => setSelected({ ...selected, model: e.target.value })}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    size={7}
                  >
                    {/* keep current value even if not in list */}
                    {!models.find(m => m.id === selected.model) && (
                      <option value={selected.model}>{selected.model} ⚠️ indisponível</option>
                    )}
                    {freeModels.length > 0 && (
                      <optgroup label="── Gratuitos ──">
                        {freeModels.map(m => (
                          <option key={m.id} value={m.id}>
                            {m.name}{ctxLabel(m.context_length)}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {paidModels.length > 0 && (
                      <optgroup label="── Pagos ──">
                        {paidModels.map(m => (
                          <option key={m.id} value={m.id}>
                            {m.name}{ctxLabel(m.context_length)}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {!modelsLoading && filteredModels.length === 0 && (
                      <option disabled>Nenhum modelo encontrado</option>
                    )}
                  </select>
                  <p className="text-xs text-muted-foreground">
                    {modelsLoading ? "Carregando modelos…" : `${freeModels.length} gratuitos · ${paidModels.length} pagos · via OpenRouter`}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label>Prompt de sistema</Label>
                  <p className="text-xs text-muted-foreground">
                    Define a personalidade, escopo e comportamento do agente. A base de conhecimento e o contexto de dados são adicionados automaticamente após este prompt.
                  </p>
                  <Textarea
                    value={selected.system_prompt}
                    onChange={e => setSelected({ ...selected, system_prompt: e.target.value })}
                    rows={8}
                    className="font-mono text-xs"
                    placeholder="Você é um assistente especializado em…"
                  />
                </div>
              </TabsContent>

              <TabsContent value="knowledge" className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Documentos que o agente usa como referência ao responder. Máx. 20 documentos.
                </p>
                {visibleDocs.length === 0 && (
                  <p className="text-sm text-muted-foreground py-2">Nenhum documento. O agente responde apenas com o prompt de sistema.</p>
                )}
                {docs.map((doc, i) => doc._deleted ? null : (
                  <Card key={i} className="space-y-2 p-3">
                    <div className="flex items-center gap-2">
                      <span className="w-5 text-center text-xs font-semibold text-muted-foreground">#{visibleDocs.indexOf(doc) + 1}</span>
                      <Input
                        placeholder="Título do documento"
                        value={doc.title}
                        onChange={e => updateDoc(i, { title: e.target.value })}
                        className="h-8 flex-1 text-xs"
                      />
                      <button onClick={() => deleteDoc(i)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <Textarea
                      placeholder="Conteúdo do documento…"
                      value={doc.content}
                      onChange={e => updateDoc(i, { content: e.target.value })}
                      className="min-h-24 text-xs"
                    />
                  </Card>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addDoc} disabled={visibleDocs.length >= 20}>
                  <Plus className="mr-1 h-4 w-4" /> Adicionar documento
                </Button>
              </TabsContent>

              <TabsContent value="test">
                <AiChatPanel
                  agentSlug={selected.slug}
                  agentName={selected.name}
                  className="h-[500px]"
                />
              </TabsContent>
            </Tabs>
          </Card>
        ) : (
          <div className="flex items-center justify-center rounded-2xl border border-dashed border-border bg-card p-16 text-muted-foreground">
            Selecione um agente para configurar
          </div>
        )}
      </div>
    </div>
  );
}
