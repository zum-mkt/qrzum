import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import Papa from "papaparse";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Download, Upload } from "lucide-react";
import { toast } from "sonner";
import { generateShortId, buildQrUrl, buildWhatsAppUrl, buildWifiString } from "@/lib/qr";

export const Route = createFileRoute("/_authenticated/bulk")({
  head: () => ({ meta: [{ title: "Criar em lote — QRzum" }] }),
  component: BulkPage,
});

const TYPES = ["link", "whatsapp", "wifi", "video"] as const;
type BulkType = typeof TYPES[number];

type Row = {
  title: string;
  type: BulkType;
  destination: string;
  extra: string; // wifi password OR whatsapp message
  color: string;
  bg_color: string;
  ga4_id: string;
  meta_pixel_id: string;
  error?: string;
};

const TEMPLATE =
  "title,type,destination,extra,color,bg_color,ga4_id,meta_pixel_id\n" +
  'Cardápio,link,https://exemplo.com/cardapio,,#0f172a,#ffffff,,\n' +
  'WhatsApp Loja,whatsapp,5511999999999,Olá!,#0f172a,#ffffff,,\n' +
  'WiFi Loja,wifi,MinhaRede,senha123,#0f172a,#ffffff,,\n';

function validate(r: Row): string | undefined {
  if (!r.title?.trim()) return "Título obrigatório";
  if (!(TYPES as readonly string[]).includes(r.type)) return `Tipo inválido (${r.type})`;
  if (!r.destination?.trim()) return "Destino obrigatório";
  if (r.type === "link" || r.type === "video") {
    try { new URL(r.destination); } catch { return "URL inválida"; }
  }
  return undefined;
}

function buildDestination(r: Row): string {
  if (r.type === "whatsapp") return buildWhatsAppUrl(r.destination, r.extra || undefined);
  if (r.type === "wifi") return buildWifiString(r.destination, r.extra || "", "WPA", false);
  return r.destination;
}

function BulkPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [results, setResults] = useState<{ title: string; short_id: string; type: string; url: string }[]>([]);
  const [busy, setBusy] = useState(false);

  const onFile = (f: File | null) => {
    if (!f) return;
    Papa.parse<Record<string, string>>(f, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const parsed: Row[] = res.data.map((r) => {
          const row: Row = {
            title: (r.title || "").trim(),
            type: ((r.type || "link") as BulkType),
            destination: (r.destination || "").trim(),
            extra: (r.extra || "").trim(),
            color: (r.color || "#0f172a").trim(),
            bg_color: (r.bg_color || "#ffffff").trim(),
            ga4_id: (r.ga4_id || "").trim(),
            meta_pixel_id: (r.meta_pixel_id || "").trim(),
          };
          row.error = validate(row);
          return row;
        });
        setRows(parsed);
        const ok = parsed.filter((r) => !r.error).length;
        toast.success(`${parsed.length} linhas carregadas (${ok} válidas)`);
      },
      error: (err) => toast.error(`CSV inválido: ${err.message}`),
    });
  };

  const downloadTemplate = () => {
    const blob = new Blob([TEMPLATE], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "qrzum-template.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const create = async () => {
    const valid = rows.filter((r) => !r.error);
    if (valid.length === 0) return toast.error("Nenhuma linha válida para criar");
    setBusy(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Não autenticado");
      const inserts = valid.map((r) => {
        const short_id = generateShortId();
        return {
          short_id,
          row: r,
          payload: {
            user_id: u.user!.id,
            title: r.title,
            type: r.type,
            short_id,
            destination_url: buildDestination(r),
            color: r.color,
            bg_color: r.bg_color,
            frame_style: "none",
            ga4_id: r.ga4_id || null,
            meta_pixel_id: r.meta_pixel_id || null,
          },
        };
      });
      const { error } = await (supabase.from("qr_links") as any).insert(inserts.map((i) => i.payload));
      if (error) throw error;
      setResults(inserts.map((i) => ({
        title: i.row.title, short_id: i.short_id, type: i.row.type,
        url: i.row.type === "wifi" ? i.payload.destination_url : buildQrUrl(i.short_id),
      })));
      toast.success(`${inserts.length} QR Codes criados!`);
      setRows([]);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const exportResults = () => {
    const lines = ["title,short_id,type,url", ...results.map((r) =>
      [r.title, r.short_id, r.type, r.url].map((v) => `"${(v || "").replace(/"/g, '""')}"`).join(",")
    )];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "qrzum-resultados.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const okCount = rows.filter((r) => !r.error).length;

  return (
    <div className="space-y-6">
      <div>
        <Link to="/dashboard" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Criar em lote (CSV)</h1>
        <p className="text-sm text-muted-foreground">
          Suba um CSV com os tipos <code>link</code>, <code>whatsapp</code>, <code>wifi</code> ou <code>video</code>.
        </p>
      </div>

      <Card className="p-5">
        <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
          <div className="space-y-2">
            <Label htmlFor="csv">Arquivo CSV</Label>
            <Input id="csv" type="file" accept=".csv,text/csv" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
          </div>
          <div className="flex items-end">
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="mr-2 h-4 w-4" /> Modelo
            </Button>
          </div>
        </div>
      </Card>

      {rows.length > 0 && (
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-border bg-muted/40 p-3">
            <div className="text-sm">
              <span className="font-medium">{rows.length}</span> linhas — <span className="text-green-600">{okCount} válidas</span>
              {rows.length - okCount > 0 && <span className="text-amber-600"> · {rows.length - okCount} com erro</span>}
            </div>
            <Button onClick={create} disabled={busy || okCount === 0}>
              <Upload className="mr-2 h-4 w-4" /> Criar {okCount} QR Codes
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Destino</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{r.title || <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell><Badge variant="secondary">{r.type}</Badge></TableCell>
                  <TableCell className="max-w-[260px] truncate text-xs text-muted-foreground">{r.destination}</TableCell>
                  <TableCell>
                    {r.error
                      ? <Badge variant="destructive">{r.error}</Badge>
                      : <Badge className="bg-green-600/15 text-green-700 hover:bg-green-600/20">OK</Badge>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {results.length > 0 && (
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-border bg-muted/40 p-3">
            <div className="text-sm font-medium">{results.length} QR Codes criados</div>
            <Button variant="outline" size="sm" onClick={exportResults}>
              <Download className="mr-2 h-4 w-4" /> Exportar CSV
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>URL</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((r) => (
                <TableRow key={r.short_id}>
                  <TableCell className="font-medium">{r.title}</TableCell>
                  <TableCell><Badge variant="secondary">{r.type}</Badge></TableCell>
                  <TableCell className="max-w-[420px] truncate text-xs">
                    <a href={r.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">{r.url}</a>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}