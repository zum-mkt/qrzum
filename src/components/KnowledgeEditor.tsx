import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listKnowledge, saveKnowledge } from "@/lib/knowledge.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

type Doc = { title: string; content: string; source_url: string | null };

function emptyDoc(): Doc {
  return { title: "", content: "", source_url: null };
}

export function KnowledgeEditor({ qrId }: { qrId: string }) {
  const qc = useQueryClient();
  const { data: initial, isLoading } = useQuery({
    queryKey: ["qr-knowledge", qrId],
    queryFn: () => listKnowledge({ data: { qrId } }),
  });

  const [docs, setDocs] = useState<Doc[] | null>(null);
  const [saving, setSaving] = useState(false);

  const effective: Doc[] =
    docs ??
    (initial ?? []).map((d: any) => ({
      title: d.title,
      content: d.content,
      source_url: d.source_url ?? null,
    }));

  const update = (i: number, patch: Partial<Doc>) =>
    setDocs(effective.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));

  const addDoc = () => {
    if (effective.length >= 20) return toast.error("Máximo 20 documentos");
    setDocs([...effective, emptyDoc()]);
  };

  const removeDoc = (i: number) => setDocs(effective.filter((_, idx) => idx !== i));

  const save = async () => {
    const invalid = effective.find((d) => !d.title.trim() || !d.content.trim());
    if (invalid) return toast.error("Título e conteúdo são obrigatórios em todos os documentos");
    setSaving(true);
    try {
      await saveKnowledge({ data: { qrId, docs: effective } });
      qc.invalidateQueries({ queryKey: ["qr-knowledge", qrId] });
      setDocs(null);
      toast.success("Knowledge pack salvo");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <p className="py-4 text-sm text-muted-foreground">Carregando…</p>;

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Documentos usados pelo assistente AI ao responder perguntas neste QR. Máx. 20 docs · 30.000 chars cada.
      </p>

      {effective.length === 0 && (
        <p className="py-2 text-sm text-muted-foreground">Nenhum documento. O assistente responde com conhecimento geral.</p>
      )}

      {effective.map((doc, i) => (
        <Card key={i} className="space-y-2 p-3">
          <div className="flex items-center gap-2">
            <span className="w-5 text-center text-xs font-semibold text-muted-foreground">#{i + 1}</span>
            <Input
              placeholder="Título do documento"
              value={doc.title}
              onChange={(e) => update(i, { title: e.target.value })}
              className="h-8 flex-1 text-xs"
            />
            <button onClick={() => removeDoc(i)} className="text-muted-foreground hover:text-destructive">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          <Textarea
            placeholder="Conteúdo do documento…"
            value={doc.content}
            onChange={(e) => update(i, { content: e.target.value })}
            className="min-h-[80px] text-xs"
          />
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">URL fonte (opcional)</Label>
            <Input
              placeholder="https://…"
              value={doc.source_url ?? ""}
              onChange={(e) => update(i, { source_url: e.target.value || null })}
              className="h-8 text-xs"
            />
          </div>
        </Card>
      ))}

      <div className="flex items-center justify-between pt-1">
        <Button type="button" variant="outline" size="sm" onClick={addDoc} disabled={effective.length >= 20}>
          <Plus className="mr-1 h-4 w-4" /> Adicionar documento
        </Button>
        <Button type="button" size="sm" onClick={save} disabled={saving}>
          {saving ? "Salvando…" : "Salvar knowledge"}
        </Button>
      </div>
    </div>
  );
}
