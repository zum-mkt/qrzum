import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Copy, Pencil, Trash2, QrCode as QrIcon, Plus, MousePointerClick,
  ExternalLink, Search, BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import { QRCodePreview } from "@/components/QRCodePreview";
import { QRStyleFields, type QRStyle } from "@/components/QRStyleFields";
import { PixelFields } from "@/components/PixelFields";
import { buildQrUrl, QR_TYPE_LABELS, emptyPixelConfig, type FrameStyle, type PixelConfig } from "@/lib/qr";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — QRFlow" }] }),
  component: Dashboard,
});

type Row = {
  id: string;
  title: string;
  type: string;
  short_id: string;
  destination_url: string;
  color: string;
  bg_color: string;
  frame_style: FrameStyle;
  logo_url: string | null;
  clicks: number;
  created_at: string;
  active: boolean;
};

type SortKey = "recent" | "scans";
type StatusFilter = "all" | "active" | "inactive";

function Dashboard() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["qr_links"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("qr_links")
        .select("id,title,type,short_id,destination_url,color,bg_color,frame_style,logo_url,clicks,created_at,active")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Row[];
    },
  });

  const [previewRow, setPreviewRow] = useState<Row | null>(null);
  const [editRow, setEditRow] = useState<Row | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [editStyle, setEditStyle] = useState<QRStyle>({
    color: "#0f172a", bgColor: "#ffffff", frameStyle: "none", logoUrl: null,
  });
  const [editPixels, setEditPixels] = useState<PixelConfig>(emptyPixelConfig);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("recent");

  const filtered = useMemo(() => {
    let rows = data ?? [];
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter((r) => r.title.toLowerCase().includes(q));
    }
    if (typeFilter !== "all") rows = rows.filter((r) => r.type === typeFilter);
    if (statusFilter !== "all") {
      rows = rows.filter((r) => (statusFilter === "active" ? r.active : !r.active));
    }
    rows = [...rows].sort((a, b) =>
      sortKey === "scans"
        ? b.clicks - a.clicks
        : new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    return rows;
  }, [data, search, typeFilter, statusFilter, sortKey]);

  const total = data?.length ?? 0;
  const totalClicks = data?.reduce((s, r) => s + r.clicks, 0) ?? 0;

  const availableTypes = useMemo(() => {
    const set = new Set(data?.map((r) => r.type) ?? []);
    return Array.from(set);
  }, [data]);

  const copyLink = (row: Row) => {
    const v = row.type === "wifi" ? row.destination_url : buildQrUrl(row.short_id);
    navigator.clipboard.writeText(v);
    toast.success(row.type === "wifi" ? "Conteúdo WiFi copiado!" : "Link copiado!");
  };

  const onDelete = async (id: string) => {
    if (!confirm("Apagar este QR Code?")) return;
    const { error } = await supabase.from("qr_links").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Apagado");
    qc.invalidateQueries({ queryKey: ["qr_links"] });
  };

  const toggleActive = async (row: Row) => {
    const { error } = await supabase.from("qr_links").update({ active: !row.active }).eq("id", row.id);
    if (error) return toast.error(error.message);
    toast.success(row.active ? "QR pausado" : "QR reativado");
    qc.invalidateQueries({ queryKey: ["qr_links"] });
  };

  const openEdit = async (row: Row) => {
    setEditRow(row);
    setEditTitle(row.title);
    setEditUrl(row.destination_url);
    setEditStyle({
      color: row.color,
      bgColor: row.bg_color ?? "#ffffff",
      frameStyle: (row.frame_style ?? "none") as FrameStyle,
      logoUrl: row.logo_url ?? null,
    });
    setEditPixels(emptyPixelConfig);
    const { data } = await (supabase.from("qr_links") as any)
      .select("ga4_id,gtm_id,meta_pixel_id,tiktok_pixel_id,linkedin_partner_id,twitter_pixel_id,pinterest_tag_id,add_utm")
      .eq("id", row.id)
      .maybeSingle();
    if (data) {
      setEditPixels({
        ga4Id: data.ga4_id, gtmId: data.gtm_id, metaPixelId: data.meta_pixel_id,
        tiktokPixelId: data.tiktok_pixel_id, linkedinPartnerId: data.linkedin_partner_id,
        twitterPixelId: data.twitter_pixel_id, pinterestTagId: data.pinterest_tag_id,
        addUtm: !!data.add_utm,
      });
    }
  };

  const saveEdit = async () => {
    if (!editRow) return;
    const { error } = await (supabase.from("qr_links") as any)
      .update({
        title: editTitle,
        destination_url: editUrl,
        color: editStyle.color,
        bg_color: editStyle.bgColor,
        frame_style: editStyle.frameStyle,
        logo_url: editStyle.logoUrl,
        ga4_id: editPixels.ga4Id || null,
        gtm_id: editPixels.gtmId || null,
        meta_pixel_id: editPixels.metaPixelId || null,
        tiktok_pixel_id: editPixels.tiktokPixelId || null,
        linkedin_partner_id: editPixels.linkedinPartnerId || null,
        twitter_pixel_id: editPixels.twitterPixelId || null,
        pinterest_tag_id: editPixels.pinterestTagId || null,
        add_utm: !!editPixels.addUtm,
      })
      .eq("id", editRow.id);
    if (error) return toast.error(error.message);
    toast.success("Salvo");
    setEditRow(null);
    qc.invalidateQueries({ queryKey: ["qr_links"] });
  };

  const qrValueFor = (row: Row) => (row.type === "wifi" ? row.destination_url : buildQrUrl(row.short_id));

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
        <div className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/40 p-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome..." className="pl-9" />
          </div>
          <Select value={typeFilter} onChange={setTypeFilter}>
            <option value="all">Todos os tipos</option>
            {availableTypes.map((t) => (
              <option key={t} value={t}>{QR_TYPE_LABELS[t] ?? t}</option>
            ))}
          </Select>
          <Select value={statusFilter} onChange={(v) => setStatusFilter(v as StatusFilter)}>
            <option value="all">Todos os status</option>
            <option value="active">Ativos</option>
            <option value="inactive">Pausados</option>
          </Select>
          <Select value={sortKey} onChange={(v) => setSortKey(v as SortKey)}>
            <option value="recent">Mais recentes</option>
            <option value="scans">Mais escaneados</option>
          </Select>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Cliques</TableHead>
              <TableHead>Criado</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">Carregando...</TableCell></TableRow>
            )}
            {!isLoading && filtered.length === 0 && total === 0 && (
              <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                Nenhum QR Code ainda. <Link to="/create" className="text-primary underline">Criar o primeiro</Link>.
              </TableCell></TableRow>
            )}
            {!isLoading && filtered.length === 0 && total > 0 && (
              <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                Nenhum resultado para os filtros atuais.
              </TableCell></TableRow>
            )}
            {filtered.map((row) => (
              <TableRow key={row.id} className={row.active ? "" : "opacity-60"}>
                <TableCell className="font-medium">{row.title}</TableCell>
                <TableCell><Badge variant="secondary">{QR_TYPE_LABELS[row.type] ?? row.type}</Badge></TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Switch checked={row.active} onCheckedChange={() => toggleActive(row)} />
                    <span className="text-xs text-muted-foreground">{row.active ? "Ativo" : "Pausado"}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right tabular-nums">{row.clicks}</TableCell>
                <TableCell className="text-muted-foreground">{new Date(row.created_at).toLocaleDateString()}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" title="Copiar link" onClick={() => copyLink(row)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Link to="/analytics/$qrId" params={{ qrId: row.id }}>
                      <Button size="icon" variant="ghost" title="Ver analytics"><BarChart3 className="h-4 w-4" /></Button>
                    </Link>
                    {row.type !== "wifi" && (
                      <a href={buildQrUrl(row.short_id)} target="_blank" rel="noreferrer">
                        <Button size="icon" variant="ghost" title="Abrir"><ExternalLink className="h-4 w-4" /></Button>
                      </a>
                    )}
                    <Button size="icon" variant="ghost" title="Baixar QR" onClick={() => setPreviewRow(row)}>
                      <QrIcon className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" title="Editar" onClick={() => openEdit(row)}>
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
              <QRCodePreview
                value={qrValueFor(previewRow)}
                color={previewRow.color}
                bgColor={previewRow.bg_color ?? "#ffffff"}
                logoUrl={previewRow.logo_url}
                frameStyle={(previewRow.frame_style ?? "none") as FrameStyle}
                name={previewRow.title}
              />
              <code className="rounded bg-muted px-2 py-1 text-xs break-all max-w-full">{qrValueFor(previewRow)}</code>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editRow} onOpenChange={(o) => !o && setEditRow(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar QR Code</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Nome</Label>
              <Input id="edit-title" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-url">
                {editRow?.type === "wifi" ? "Conteúdo WiFi (avançado)" : "URL de destino"}
              </Label>
              <Input id="edit-url" value={editUrl} onChange={(e) => setEditUrl(e.target.value)} />
              <p className="text-xs text-muted-foreground">
                {editRow?.type === "wifi"
                  ? "WiFi é estático — editar não muda o QR já impresso."
                  : "O QR Code continua o mesmo — apenas o destino muda."}
              </p>
            </div>
            <QRStyleFields style={editStyle} onChange={setEditStyle} />
            <PixelFields
              pixels={editPixels}
              onChange={setEditPixels}
              showUtm={editRow?.type !== "wifi" && editRow?.type !== "vcard" && editRow?.type !== "links"}
            />
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

function Select<T extends string>({
  value, onChange, children,
}: { value: T; onChange: (v: T) => void; children: React.ReactNode }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="h-10 rounded-md border border-input bg-background px-3 text-sm"
    >
      {children}
    </select>
  );
}