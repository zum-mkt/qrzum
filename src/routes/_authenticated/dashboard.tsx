import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Copy, Pencil, Trash2, QrCode as QrIcon, Plus, MousePointerClick, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { QRCodePreview } from "@/components/QRCodePreview";
import { buildQrUrl } from "@/lib/qr";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — QRFlow" }] }),
  component: Dashboard,
});

type Row = {
  id: string;
  title: string;
  type: "link" | "file" | "vcard";
  short_id: string;
  destination_url: string;
  color: string;
  clicks: number;
  created_at: string;
};

function Dashboard() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["qr_links"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("qr_links")
        .select("id,title,type,short_id,destination_url,color,clicks,created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Row[];
    },
  });

  const [previewRow, setPreviewRow] = useState<Row | null>(null);
  const [editRow, setEditRow] = useState<Row | null>(null);
  const [editUrl, setEditUrl] = useState("");

  const total = data?.length ?? 0;
  const totalClicks = data?.reduce((s, r) => s + r.clicks, 0) ?? 0;

  const copyLink = (shortId: string) => {
    navigator.clipboard.writeText(buildQrUrl(shortId));
    toast.success("Link copiado!");
  };

  const onDelete = async (id: string) => {
    if (!confirm("Apagar este QR Code?")) return;
    const { error } = await supabase.from("qr_links").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Apagado");
    qc.invalidateQueries({ queryKey: ["qr_links"] });
  };

  const openEdit = (row: Row) => {
    setEditRow(row);
    setEditUrl(row.destination_url);
  };

  const saveEdit = async () => {
    if (!editRow) return;
    const { error } = await supabase
      .from("qr_links")
      .update({ destination_url: editUrl })
      .eq("id", editRow.id);
    if (error) return toast.error(error.message);
    toast.success("Destino atualizado");
    setEditRow(null);
    qc.invalidateQueries({ queryKey: ["qr_links"] });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Gerencie seus QR Codes dinâmicos</p>
        </div>
        <Link to="/create">
          <Button><Plus className="mr-2 h-4 w-4" /> Novo QR Code</Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Metric icon={<QrIcon className="h-5 w-5" />} label="Total de QR Codes" value={total} />
        <Metric icon={<MousePointerClick className="h-5 w-5" />} label="Total de scans" value={totalClicks} />
      </div>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Cliques</TableHead>
              <TableHead>Criado</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">Carregando...</TableCell></TableRow>
            )}
            {!isLoading && total === 0 && (
              <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                Nenhum QR Code ainda. <Link to="/create" className="text-primary underline">Criar o primeiro</Link>.
              </TableCell></TableRow>
            )}
            {data?.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium">{row.title}</TableCell>
                <TableCell><Badge variant="secondary" className="capitalize">{row.type}</Badge></TableCell>
                <TableCell className="text-right tabular-nums">{row.clicks}</TableCell>
                <TableCell className="text-muted-foreground">{new Date(row.created_at).toLocaleDateString()}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" title="Copiar link" onClick={() => copyLink(row.short_id)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <a href={buildQrUrl(row.short_id)} target="_blank" rel="noreferrer">
                      <Button size="icon" variant="ghost" title="Abrir"><ExternalLink className="h-4 w-4" /></Button>
                    </a>
                    <Button size="icon" variant="ghost" title="Baixar QR" onClick={() => setPreviewRow(row)}>
                      <QrIcon className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" title="Editar destino" onClick={() => openEdit(row)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" title="Apagar" onClick={() => onDelete(row.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={!!previewRow} onOpenChange={(o) => !o && setPreviewRow(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{previewRow?.title}</DialogTitle></DialogHeader>
          {previewRow && (
            <div className="flex flex-col items-center gap-3 py-2">
              <QRCodePreview value={buildQrUrl(previewRow.short_id)} color={previewRow.color} name={previewRow.title} />
              <code className="rounded bg-muted px-2 py-1 text-xs">{buildQrUrl(previewRow.short_id)}</code>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editRow} onOpenChange={(o) => !o && setEditRow(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar destino</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="edit-url">URL de destino</Label>
            <Input id="edit-url" value={editUrl} onChange={(e) => setEditUrl(e.target.value)} />
            <p className="text-xs text-muted-foreground">O QR Code continua o mesmo — apenas o destino muda.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRow(null)}>Cancelar</Button>
            <Button onClick={saveEdit}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card className="flex items-center gap-4 p-5">
      <div className="grid h-12 w-12 place-items-center rounded-lg bg-primary/10 text-primary">{icon}</div>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
      </div>
    </Card>
  );
}