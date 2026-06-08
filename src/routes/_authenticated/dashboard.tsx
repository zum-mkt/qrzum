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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Copy, Pencil, Trash2, QrCode as QrIcon, Plus, MousePointerClick,
  ExternalLink, Search, BarChart3, Folder, FolderPlus, Tag as TagIcon, X,
} from "lucide-react";
import { toast } from "sonner";
import { QRCodePreview } from "@/components/QRCodePreview";
import { QRStyleFields, type QRStyle } from "@/components/QRStyleFields";
import { PixelFields } from "@/components/PixelFields";
import { FolderTagPicker } from "@/components/FolderTagPicker";
import {
  fetchFolders, fetchTags, createFolder, deleteFolder, renameFolder, setQrTags, fetchQrTags,
} from "@/lib/organize";
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
  frame_text: string | null;
  logo_url: string | null;
  clicks: number;
  created_at: string;
  active: boolean;
  folder_id: string | null;
  qr_link_tags: { tag_id: string }[] | null;
};

type SortKey = "recent" | "scans";
type StatusFilter = "all" | "active" | "inactive";
type FolderFilter = "all" | "none" | string;

function Dashboard() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["qr_links"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("qr_links")
        .select("id,title,type,short_id,destination_url,color,bg_color,frame_style,frame_text,logo_url,clicks,created_at,active,folder_id,qr_link_tags(tag_id)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Row[];
    },
  });

  const { data: folders = [] } = useQuery({ queryKey: ["folders"], queryFn: fetchFolders });
  const { data: tags = [] } = useQuery({ queryKey: ["tags"], queryFn: fetchTags });

  const [previewRow, setPreviewRow] = useState<Row | null>(null);
  const [editRow, setEditRow] = useState<Row | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [editStyle, setEditStyle] = useState<QRStyle>({
    color: "#0f172a", bgColor: "#ffffff", frameStyle: "none", frameText: null, logoUrl: null,
  });
  const [editPixels, setEditPixels] = useState<PixelConfig>(emptyPixelConfig);
  const [editFolderId, setEditFolderId] = useState<string | null>(null);
  const [editTagIds, setEditTagIds] = useState<string[]>([]);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("recent");
  const [folderFilter, setFolderFilter] = useState<FolderFilter>("all");
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [newFolderName, setNewFolderName] = useState("");

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
    if (folderFilter === "none") rows = rows.filter((r) => !r.folder_id);
    else if (folderFilter !== "all") rows = rows.filter((r) => r.folder_id === folderFilter);
    if (tagFilter.length > 0) {
      rows = rows.filter((r) => {
        const ids = (r.qr_link_tags ?? []).map((t) => t.tag_id);
        return tagFilter.every((id) => ids.includes(id));
      });
    }
    rows = [...rows].sort((a, b) =>
      sortKey === "scans"
        ? b.clicks - a.clicks
        : new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    return rows;
  }, [data, search, typeFilter, statusFilter, sortKey, folderFilter, tagFilter]);

  const total = data?.length ?? 0;
  const totalClicks = data?.reduce((s, r) => s + r.clicks, 0) ?? 0;

  const folderCounts = useMemo(() => {
    const counts = new Map<string, number>();
    let none = 0;
    (data ?? []).forEach((r) => {
      if (r.folder_id) counts.set(r.folder_id, (counts.get(r.folder_id) || 0) + 1);
      else none += 1;
    });
    return { counts, none };
  }, [data]);

  const tagById = useMemo(() => {
    const m = new Map<string, { id: string; name: string; color: string }>();
    tags.forEach((t) => m.set(t.id, t));
    return m;
  }, [tags]);

  const folderById = useMemo(() => {
    const m = new Map<string, { id: string; name: string; color: string }>();
    folders.forEach((f) => m.set(f.id, f));
    return m;
  }, [folders]);

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

  const onCreateFolder = async () => {
    const name = newFolderName.trim();
    if (!name) return;
    try {
      const f = await createFolder(name);
      setNewFolderName("");
      qc.invalidateQueries({ queryKey: ["folders"] });
      setFolderFilter(f.id);
      toast.success("Pasta criada");
    } catch (e: any) { toast.error(e.message); }
  };

  const onRenameFolder = async (id: string, currentName: string) => {
    const name = prompt("Novo nome da pasta", currentName);
    if (!name || !name.trim() || name === currentName) return;
    try {
      await renameFolder(id, name.trim());
      qc.invalidateQueries({ queryKey: ["folders"] });
      toast.success("Renomeada");
    } catch (e: any) { toast.error(e.message); }
  };

  const onDeleteFolder = async (id: string) => {
    if (!confirm("Apagar pasta? Os QRs ficarão sem pasta.")) return;
    try {
      await deleteFolder(id);
      qc.invalidateQueries({ queryKey: ["folders"] });
      qc.invalidateQueries({ queryKey: ["qr_links"] });
      if (folderFilter === id) setFolderFilter("all");
      toast.success("Pasta apagada");
    } catch (e: any) { toast.error(e.message); }
  };

  const openEdit = async (row: Row) => {
    setEditRow(row);
    setEditTitle(row.title);
    setEditUrl(row.destination_url);
    setEditStyle({
      color: row.color,
      bgColor: row.bg_color ?? "#ffffff",
      frameStyle: (row.frame_style ?? "none") as FrameStyle,
      frameText: row.frame_text ?? null,
      logoUrl: row.logo_url ?? null,
    });
    setEditPixels(emptyPixelConfig);
    setEditFolderId(row.folder_id);
    try { setEditTagIds(await fetchQrTags(row.id)); } catch { setEditTagIds([]); }
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
        frame_text: editStyle.frameText ?? null,
        logo_url: editStyle.logoUrl,
        folder_id: editFolderId,
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
    try { await setQrTags(editRow.id, editTagIds); } catch (e: any) { toast.error(e.message); }
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

      <div className="grid gap-4 md:grid-cols-[220px_1fr]">
        <Card className="h-fit p-3">
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pastas</span>
          </div>
          <div className="space-y-0.5">
            <FolderItem active={folderFilter === "all"} onClick={() => setFolderFilter("all")} label="Todas" count={total} />
            <FolderItem active={folderFilter === "none"} onClick={() => setFolderFilter("none")} label="Sem pasta" count={folderCounts.none} />
            {folders.map((f) => (
              <FolderItem
                key={f.id}
                active={folderFilter === f.id}
                onClick={() => setFolderFilter(f.id)}
                label={f.name}
                color={f.color}
                count={folderCounts.counts.get(f.id) ?? 0}
                onRename={() => onRenameFolder(f.id, f.name)}
                onDelete={() => onDeleteFolder(f.id)}
              />
            ))}
          </div>
          <div className="mt-3 flex gap-1 border-t border-border pt-3">
            <Input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Nova pasta..."
              className="h-8 text-xs"
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), onCreateFolder())}
            />
            <Button size="icon" variant="outline" className="h-8 w-8" onClick={onCreateFolder} title="Criar pasta">
              <FolderPlus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </Card>
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
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-10">
                <TagIcon className="mr-2 h-4 w-4" />
                Tags {tagFilter.length > 0 && <Badge variant="secondary" className="ml-2">{tagFilter.length}</Badge>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2" align="end">
              {tags.length === 0 && <p className="px-2 py-1 text-xs text-muted-foreground">Nenhuma tag</p>}
              {tags.map((t) => (
                <label key={t.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted">
                  <Checkbox
                    checked={tagFilter.includes(t.id)}
                    onCheckedChange={(v) =>
                      setTagFilter((s) => (v ? [...s, t.id] : s.filter((x) => x !== t.id)))
                    }
                  />
                  {t.name}
                </label>
              ))}
              {tagFilter.length > 0 && (
                <Button variant="ghost" size="sm" className="mt-1 w-full" onClick={() => setTagFilter([])}>
                  Limpar
                </Button>
              )}
            </PopoverContent>
          </Popover>
        </div>
        {tagFilter.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/20 px-3 py-2 text-xs">
            <span className="text-muted-foreground">Filtrando por:</span>
            {tagFilter.map((id) => {
              const t = tagById.get(id);
              if (!t) return null;
              return (
                <Badge key={id} variant="secondary" className="gap-1">
                  {t.name}
                  <button onClick={() => setTagFilter((s) => s.filter((x) => x !== id))}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              );
            })}
        </div>
        )}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Pasta / Tags</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Cliques</TableHead>
              <TableHead>Criado</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">Carregando...</TableCell></TableRow>
            )}
            {!isLoading && filtered.length === 0 && total === 0 && (
              <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                Nenhum QR Code ainda. <Link to="/create" className="text-primary underline">Criar o primeiro</Link>.
              </TableCell></TableRow>
            )}
            {!isLoading && filtered.length === 0 && total > 0 && (
              <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                Nenhum resultado para os filtros atuais.
              </TableCell></TableRow>
            )}
            {filtered.map((row) => (
              <TableRow key={row.id} className={row.active ? "" : "opacity-60"}>
                <TableCell className="font-medium">{row.title}</TableCell>
                <TableCell><Badge variant="secondary">{QR_TYPE_LABELS[row.type] ?? row.type}</Badge></TableCell>
                <TableCell>
                  <div className="flex flex-wrap items-center gap-1">
                    {row.folder_id && folderById.get(row.folder_id) && (
                      <Badge variant="outline" className="gap-1">
                        <Folder className="h-3 w-3" />
                        {folderById.get(row.folder_id)!.name}
                      </Badge>
                    )}
                    {(row.qr_link_tags ?? []).map((t) => {
                      const tag = tagById.get(t.tag_id);
                      if (!tag) return null;
                      return <Badge key={t.tag_id} variant="secondary" className="text-[10px]">{tag.name}</Badge>;
                    })}
                  </div>
                </TableCell>
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
      </div>

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
                frameText={previewRow.frame_text ?? null}
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
            <FolderTagPicker
              folderId={editFolderId}
              onFolderChange={setEditFolderId}
              tagIds={editTagIds}
              onTagsChange={setEditTagIds}
            />
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

function FolderItem({
  active, onClick, label, count, color, onRename, onDelete,
}: {
  active: boolean; onClick: () => void; label: string; count: number; color?: string;
  onRename?: () => void; onDelete?: () => void;
}) {
  return (
    <div
      className={`group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm cursor-pointer ${
        active ? "bg-primary/10 text-primary" : "hover:bg-muted text-foreground"
      }`}
      onClick={onClick}
    >
      <Folder className="h-3.5 w-3.5 shrink-0" style={color ? { color } : undefined} />
      <span className="flex-1 truncate">{label}</span>
      <span className="text-xs tabular-nums text-muted-foreground">{count}</span>
      {onRename && (
        <button
          className="hidden text-muted-foreground hover:text-foreground group-hover:inline"
          onClick={(e) => { e.stopPropagation(); onRename(); }}
          title="Renomear"
        >
          <Pencil className="h-3 w-3" />
        </button>
      )}
      {onDelete && (
        <button
          className="hidden text-muted-foreground hover:text-destructive group-hover:inline"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          title="Apagar"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      )}
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