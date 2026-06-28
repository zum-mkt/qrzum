import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { listSubmissions } from "@/lib/flow.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { ClipboardList, Download, Search, MapPin, Sparkles, X } from "lucide-react";
import { FeatureGate } from "@/components/FeatureGate";
import { AiChatPanel } from "@/components/AiChatPanel";

export const Route = createFileRoute("/_authenticated/submissions")({
  head: () => ({ meta: [{ title: "Respostas — zum" }] }),
  component: SubmissionsPageGated,
});

function SubmissionsPageGated() {
  return (
    <FeatureGate featureKey="operational_flow" featureLabel="Fluxo Operacional e Respostas" requiredPlan="Pro">
      <SubmissionsPage />
    </FeatureGate>
  );
}

function SubmissionsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["submissions"],
    queryFn: () => listSubmissions({ data: {} }),
    staleTime: 30_000,
  });

  const [search, setSearch] = useState("");
  const [detail, setDetail] = useState<(typeof rows)[number] | null>(null);
  const [showAi, setShowAi] = useState(false);

  const rows = data ?? [];

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) =>
      (r.qr_links?.title ?? "").toLowerCase().includes(q),
    );
  }, [rows, search]);

  const exportCsv = () => {
    if (rows.length === 0) return;
    const allKeys = Array.from(
      new Set(rows.flatMap((r) => Object.keys(r.answers ?? {}))),
    );
    const header = ["ID", "QR Code", "Data", "Lat", "Lng", ...allKeys].join(",");
    const body = rows.map((r) => {
      const base = [
        r.id,
        `"${(r.qr_links?.title ?? "").replace(/"/g, '""')}"`,
        new Date(r.submitted_at).toLocaleString(),
        r.lat ?? "",
        r.lng ?? "",
      ];
      const vals = allKeys.map((k) => {
        const v = r.answers?.[k];
        const s = v === undefined || v === null ? "" : JSON.stringify(v);
        return `"${s.replace(/"/g, '""')}"`;
      });
      return [...base, ...vals].join(",");
    });
    const csv = [header, ...body].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `respostas-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const aiContext = useMemo(() => {
    if (rows.length === 0) return undefined;
    return `Total de respostas: ${rows.length}\n\n` + rows.slice(0, 50).map((r, i) =>
      `[${i + 1}] QR: ${r.qr_links?.title ?? "?"} | Data: ${new Date(r.submitted_at).toLocaleString()} | GPS: ${r.lat != null ? `${Number(r.lat).toFixed(4)},${Number(r.lng).toFixed(4)}` : "—"} | Respostas: ${JSON.stringify(r.answers ?? {})}`
    ).join("\n");
  }, [rows]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Respostas</h1>
          <p className="text-sm text-muted-foreground">Submissões recebidas nos fluxos de formulário</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowAi(v => !v)} disabled={rows.length === 0}>
            <Sparkles className="mr-2 h-4 w-4" /> Analisar com IA
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={rows.length === 0}>
            <Download className="mr-2 h-4 w-4" /> Exportar CSV
          </Button>
        </div>
      </div>

      {showAi && (
        <AiChatPanel
          agentSlug="submissions_analyst"
          agentName="Analista de Respostas"
          contextData={aiContext}
          onClose={() => setShowAi(false)}
          className="h-96"
        />
      )}

      <Card className="overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border bg-muted/40 p-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filtrar por QR Code…"
              className="pl-9"
            />
          </div>
          <Badge variant="secondary">{rows.length} {rows.length === 1 ? "resposta" : "respostas"}</Badge>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>QR Code</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Localização</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">Carregando…</TableCell>
              </TableRow>
            )}
            {!isLoading && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                  {rows.length === 0 ? (
                    <div className="flex flex-col items-center gap-2">
                      <ClipboardList className="h-8 w-8 opacity-30" />
                      <p>Nenhuma resposta ainda.</p>
                      <p className="text-xs">As respostas aparecem aqui após o scan de QRs com bloco Formulário.</p>
                    </div>
                  ) : "Nenhum resultado para o filtro."}
                </TableCell>
              </TableRow>
            )}
            {filtered.map((row) => (
              <TableRow
                key={row.id}
                className="cursor-pointer"
                onClick={() => setDetail(row)}
              >
                <TableCell className="font-medium">{row.qr_links?.title ?? "(QR removido)"}</TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {new Date(row.submitted_at).toLocaleString()}
                </TableCell>
                <TableCell>
                  {row.lat != null && row.lng != null ? (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {Number(row.lat).toFixed(4)}, {Number(row.lng).toFixed(4)}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setDetail(row); }}>
                    Ver
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{detail?.qr_links?.title ?? "Resposta"}</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-4 text-sm">
              <dl className="grid grid-cols-3 gap-y-2 rounded-lg bg-muted/40 p-3 text-xs">
                <dt className="text-muted-foreground">Data</dt>
                <dd className="col-span-2">{new Date(detail.submitted_at).toLocaleString()}</dd>
                {detail.lat != null && (
                  <>
                    <dt className="text-muted-foreground">Localização</dt>
                    <dd className="col-span-2">
                      {Number(detail.lat).toFixed(6)}, {Number(detail.lng).toFixed(6)}
                    </dd>
                  </>
                )}
                {detail.device_fp && (
                  <>
                    <dt className="text-muted-foreground">Device FP</dt>
                    <dd className="col-span-2 truncate font-mono">{detail.device_fp}</dd>
                  </>
                )}
              </dl>
              <div className="space-y-3">
                <p className="font-semibold">Respostas</p>
                {Object.entries(detail.answers ?? {}).length === 0 ? (
                  <p className="text-muted-foreground text-xs">Sem respostas registradas.</p>
                ) : (
                  Object.entries(detail.answers ?? {}).map(([blockId, blockAnswers]) => (
                    <div key={blockId} className="rounded-lg border border-border p-3 space-y-2">
                      <p className="text-xs text-muted-foreground font-mono">Bloco: {blockId.slice(0, 8)}…</p>
                      {Object.entries(blockAnswers as Record<string, unknown>).map(([field, value]) => (
                        <div key={field}>
                          <p className="text-xs font-medium text-muted-foreground">{field}</p>
                          <p className="text-sm break-words">
                            {Array.isArray(value) ? value.join(", ") : String(value ?? "—")}
                          </p>
                        </div>
                      ))}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
