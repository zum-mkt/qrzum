import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  generateShortId, buildQrUrl, buildWhatsAppUrl, buildWifiString,
  buildInternalUrl,
  type VCardData, type LinksData, type WifiAuth, type FrameStyle,
  type PixelConfig, emptyPixelConfig,
} from "@/lib/qr";
import { QRCodePreview } from "@/components/QRCodePreview";
import { QRStyleFields, defaultStyle, type QRStyle } from "@/components/QRStyleFields";
import { PixelFields } from "@/components/PixelFields";
import { FolderTagPicker } from "@/components/FolderTagPicker";
import { setQrTags } from "@/lib/organize";
import {
  Copy, Link as LinkIcon, FileUp, Contact, ArrowLeft,
  MessageCircle, Wifi, Video, ListOrdered, Plus, Trash2, FileText, Workflow,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/create")({
  head: () => ({ meta: [{ title: "Criar QR Code — zum" }] }),
  component: Create,
});

type QrType = "link" | "file" | "vcard" | "whatsapp" | "wifi" | "video" | "links" | "pdf" | "flow";
type Created = {
  shortId: string;
  title: string;
  style: QRStyle;
  /** valor literal a codificar no QR (definido => QR estático, sem link curto) */
  qrValue?: string;
} | null;

function Create() {
  const [created, setCreated] = useState<Created>(null);
  const [style, setStyle] = useState<QRStyle>(defaultStyle());
  const [pixels, setPixels] = useState<PixelConfig>(emptyPixelConfig);
  const [folderId, setFolderId] = useState<string | null>(null);
  const [tagIds, setTagIds] = useState<string[]>([]);
  if (created) return <Success created={created} reset={() => setCreated(null)} />;

  return (
    <div className="space-y-6">
      <div>
        <Link to="/dashboard" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Criar QR Code</h1>
        <p className="text-sm text-muted-foreground">Escolha um tipo abaixo</p>
      </div>

      <Card className="p-6">
        <Tabs defaultValue="link">
          <TabsList className="grid w-full grid-cols-5 sm:grid-cols-9">
            <TabsTrigger value="link"><LinkIcon className="mr-1.5 h-4 w-4" /> Link</TabsTrigger>
            <TabsTrigger value="whatsapp"><MessageCircle className="mr-1.5 h-4 w-4" /> WhatsApp</TabsTrigger>
            <TabsTrigger value="vcard"><Contact className="mr-1.5 h-4 w-4" /> vCard</TabsTrigger>
            <TabsTrigger value="pdf"><FileText className="mr-1.5 h-4 w-4" /> PDF</TabsTrigger>
            <TabsTrigger value="file"><FileUp className="mr-1.5 h-4 w-4" /> Arquivo</TabsTrigger>
            <TabsTrigger value="links"><ListOrdered className="mr-1.5 h-4 w-4" /> Links</TabsTrigger>
            <TabsTrigger value="video"><Video className="mr-1.5 h-4 w-4" /> Vídeo</TabsTrigger>
            <TabsTrigger value="wifi"><Wifi className="mr-1.5 h-4 w-4" /> WiFi</TabsTrigger>
            <TabsTrigger value="flow"><Workflow className="mr-1.5 h-4 w-4" /> Fluxo</TabsTrigger>
          </TabsList>
          <div className="mt-6 mb-6">
            <FolderTagPicker folderId={folderId} onFolderChange={setFolderId} tagIds={tagIds} onTagsChange={setTagIds} />
          </div>
          <TabsContent value="link" className="mt-6"><LinkForm style={style} setStyle={setStyle} pixels={pixels} setPixels={setPixels} folderId={folderId} tagIds={tagIds} onCreated={setCreated} /></TabsContent>
          <TabsContent value="whatsapp" className="mt-6"><WhatsAppForm style={style} setStyle={setStyle} pixels={pixels} setPixels={setPixels} folderId={folderId} tagIds={tagIds} onCreated={setCreated} /></TabsContent>
          <TabsContent value="vcard" className="mt-6"><VCardForm style={style} setStyle={setStyle} pixels={pixels} setPixels={setPixels} folderId={folderId} tagIds={tagIds} onCreated={setCreated} /></TabsContent>
          <TabsContent value="pdf" className="mt-6"><FileForm style={style} setStyle={setStyle} pixels={pixels} setPixels={setPixels} folderId={folderId} tagIds={tagIds} onCreated={setCreated} pdfOnly /></TabsContent>
          <TabsContent value="file" className="mt-6"><FileForm style={style} setStyle={setStyle} pixels={pixels} setPixels={setPixels} folderId={folderId} tagIds={tagIds} onCreated={setCreated} /></TabsContent>
          <TabsContent value="links" className="mt-6"><LinksForm style={style} setStyle={setStyle} pixels={pixels} setPixels={setPixels} folderId={folderId} tagIds={tagIds} onCreated={setCreated} /></TabsContent>
          <TabsContent value="video" className="mt-6"><VideoForm style={style} setStyle={setStyle} pixels={pixels} setPixels={setPixels} folderId={folderId} tagIds={tagIds} onCreated={setCreated} /></TabsContent>
          <TabsContent value="wifi" className="mt-6"><WifiForm style={style} setStyle={setStyle} pixels={pixels} setPixels={setPixels} folderId={folderId} tagIds={tagIds} onCreated={setCreated} /></TabsContent>
          <TabsContent value="flow" className="mt-6"><FlowForm folderId={folderId} tagIds={tagIds} /></TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}

type FormCtx = {
  style: QRStyle; setStyle: (s: QRStyle) => void;
  pixels: PixelConfig; setPixels: (p: PixelConfig) => void;
  folderId: string | null;
  tagIds: string[];
  onCreated: (c: Created) => void;
};

async function insertRow(args: {
  title: string;
  type: QrType;
  destination_url: string;
  vcard_data?: VCardData | LinksData | Record<string, unknown>;
  style: QRStyle;
  pixels: PixelConfig;
  folderId?: string | null;
  tagIds?: string[];
}) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Não autenticado");
  const short_id = generateShortId();
  const { data: inserted, error } = await (supabase.from("qr_links") as any).insert({
    user_id: u.user.id,
    title: args.title,
    type: args.type,
    short_id,
    destination_url: args.destination_url,
    vcard_data: (args.vcard_data ?? null) as never,
    color: args.style.color,
    bg_color: args.style.bgColor,
    frame_style: args.style.frameStyle,
    frame_text: args.style.frameText ?? null,
    logo_url: args.style.logoUrl,
    folder_id: args.folderId ?? null,
    ga4_id: args.pixels.ga4Id || null,
    gtm_id: args.pixels.gtmId || null,
    meta_pixel_id: args.pixels.metaPixelId || null,
    tiktok_pixel_id: args.pixels.tiktokPixelId || null,
    linkedin_partner_id: args.pixels.linkedinPartnerId || null,
    twitter_pixel_id: args.pixels.twitterPixelId || null,
    pinterest_tag_id: args.pixels.pinterestTagId || null,
    add_utm: !!args.pixels.addUtm,
  }).select("id").single();
  if (error) throw error;
  if (args.tagIds && args.tagIds.length > 0 && inserted?.id) {
    try { await setQrTags(inserted.id as string, args.tagIds); } catch { /* non-fatal */ }
  }
  return short_id;
}

function Field({
  label, value, onChange, type = "text", placeholder, required = true,
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} required={required} />
    </div>
  );
}

function LinkForm({ style, setStyle, pixels, setPixels, folderId, tagIds, onCreated }: FormCtx) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const short = await insertRow({ title, type: "link", destination_url: url, style, pixels, folderId, tagIds });
      onCreated({ shortId: short, style, title });
      toast.success("QR Code criado!");
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Nome interno" placeholder="Cardápio Mesa 12" value={title} onChange={setTitle} />
      <Field label="URL de destino" placeholder="https://..." value={url} onChange={setUrl} type="url" />
      <QRStyleFields style={style} onChange={setStyle} />
      <PixelFields pixels={pixels} onChange={setPixels} showUtm />
      <Button type="submit" disabled={loading}>{loading ? "Criando..." : "Criar QR Code"}</Button>
    </form>
  );
}

function VideoForm({ style, setStyle, pixels, setPixels, folderId, tagIds, onCreated }: FormCtx) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const short = await insertRow({ title, type: "video", destination_url: url, style, pixels, folderId, tagIds });
      onCreated({ shortId: short, style, title });
      toast.success("QR Code criado!");
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Nome interno" placeholder="Vídeo institucional" value={title} onChange={setTitle} />
      <Field label="URL do vídeo" placeholder="https://youtube.com/watch?v=..." value={url} onChange={setUrl} type="url" />
      <QRStyleFields style={style} onChange={setStyle} />
      <PixelFields pixels={pixels} onChange={setPixels} showUtm />
      <Button type="submit" disabled={loading}>{loading ? "Criando..." : "Criar QR Code"}</Button>
    </form>
  );
}

function WhatsAppForm({ style, setStyle, pixels, setPixels, folderId, tagIds, onCreated }: FormCtx) {
  const [title, setTitle] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const dest = buildWhatsAppUrl(phone, message || undefined);
      const short = await insertRow({ title, type: "whatsapp", destination_url: dest, style, pixels, folderId, tagIds });
      onCreated({ shortId: short, style, title });
      toast.success("QR Code criado!");
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Nome interno" placeholder="Atendimento Loja" value={title} onChange={setTitle} />
      <Field label="Telefone (com DDI/DDD)" placeholder="5511999999999" value={phone} onChange={setPhone} />
      <div className="space-y-2">
        <Label>Mensagem inicial (opcional)</Label>
        <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Olá! Vim pelo QR Code..." rows={3} />
      </div>
      <QRStyleFields style={style} onChange={setStyle} />
      <PixelFields pixels={pixels} onChange={setPixels} showUtm={false} />
      <Button type="submit" disabled={loading}>{loading ? "Criando..." : "Criar QR Code"}</Button>
    </form>
  );
}

function WifiForm({ style, setStyle, pixels, setPixels, folderId, tagIds, onCreated }: FormCtx) {
  const [title, setTitle] = useState("");
  const [ssid, setSsid] = useState("");
  const [password, setPassword] = useState("");
  const [auth, setAuth] = useState<WifiAuth>("WPA");
  const [hidden, setHidden] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const wifi = buildWifiString(ssid, password, auth, hidden);
      const short = await insertRow({
        title, type: "wifi", destination_url: wifi, style,
        vcard_data: { ssid, password, auth, hidden },
        pixels, folderId, tagIds,
      });
      onCreated({ shortId: short, style, title, qrValue: wifi });
      toast.success("QR Code criado!");
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Nome interno" placeholder="WiFi da loja" value={title} onChange={setTitle} />
      <Field label="Nome da rede (SSID)" value={ssid} onChange={setSsid} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Criptografia</Label>
          <select
            value={auth}
            onChange={(e) => setAuth(e.target.value as WifiAuth)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="WPA">WPA/WPA2</option>
            <option value="WEP">WEP</option>
            <option value="nopass">Sem senha</option>
          </select>
        </div>
        <Field label="Senha" value={password} onChange={setPassword} required={auth !== "nopass"} />
      </div>
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <input type="checkbox" checked={hidden} onChange={(e) => setHidden(e.target.checked)} />
        Rede oculta
      </label>
      <QRStyleFields style={style} onChange={setStyle} />
      <p className="text-xs text-muted-foreground">
        QR Code estático: o aparelho conecta direto na rede ao escanear (sem redirect).
      </p>
      <Button type="submit" disabled={loading}>{loading ? "Criando..." : "Criar QR Code"}</Button>
    </form>
  );
}

function LinksForm({ style, setStyle, pixels, setPixels, folderId, tagIds, onCreated }: FormCtx) {
  const [title, setTitle] = useState("");
  const [bio, setBio] = useState("");
  const [items, setItems] = useState<{ label: string; url: string }[]>([
    { label: "", url: "" },
  ]);
  const [loading, setLoading] = useState(false);

  const update = (i: number, key: "label" | "url", val: string) =>
    setItems((s) => s.map((it, idx) => (idx === i ? { ...it, [key]: val } : it)));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const cleaned = items.filter((it) => it.label.trim() && it.url.trim());
    if (cleaned.length === 0) return toast.error("Adicione ao menos um link");
    setLoading(true);
    try {
      const payload: LinksData = { bio: bio || undefined, items: cleaned };
      const short = await insertRow({
        title,
        type: "links",
        destination_url: buildInternalUrl(`/links/`),
        vcard_data: payload, style, pixels, folderId, tagIds,
      });
      await supabase
        .from("qr_links")
        .update({ destination_url: buildInternalUrl(`/links/${short}`) })
        .eq("short_id", short);
      onCreated({ shortId: short, style, title });
      toast.success("Lista de links criada!");
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Título da página" placeholder="Minhas redes" value={title} onChange={setTitle} />
      <div className="space-y-2">
        <Label>Bio (opcional)</Label>
        <Textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={2} />
      </div>
      <div className="space-y-2">
        <Label>Links</Label>
        {items.map((it, i) => (
          <div key={i} className="flex gap-2">
            <Input placeholder="Texto do botão" value={it.label} onChange={(e) => update(i, "label", e.target.value)} />
            <Input placeholder="https://..." value={it.url} onChange={(e) => update(i, "url", e.target.value)} />
            <Button type="button" variant="ghost" size="icon"
              onClick={() => setItems((s) => s.filter((_, idx) => idx !== i))}
              disabled={items.length === 1}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={() => setItems((s) => [...s, { label: "", url: "" }])}>
          <Plus className="mr-1 h-4 w-4" /> Adicionar link
        </Button>
      </div>
      <QRStyleFields style={style} onChange={setStyle} />
      <PixelFields pixels={pixels} onChange={setPixels} showUtm={false} />
      <Button type="submit" disabled={loading}>{loading ? "Criando..." : "Criar QR Code"}</Button>
    </form>
  );
}

function FileForm({ style, setStyle, pixels, setPixels, folderId, tagIds, onCreated, pdfOnly }: FormCtx & { pdfOnly?: boolean }) {
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) return toast.error("Selecione um arquivo");
    setLoading(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Não autenticado");
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${u.user.id}/${Date.now()}_${safeName}`;
      const { error: upErr } = await supabase.storage.from("qr_files").upload(path, file, { upsert: false });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("qr_files").getPublicUrl(path);
      const short = await insertRow({ title, type: pdfOnly ? "pdf" : "file", destination_url: pub.publicUrl, style, pixels, folderId, tagIds });
      onCreated({ shortId: short, style, title });
      toast.success("QR Code criado!");
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Nome interno" placeholder="Manual do produto" value={title} onChange={setTitle} />
      <div className="space-y-2">
        <Label htmlFor="file">{pdfOnly ? "PDF" : "Arquivo (PDF/imagem)"}</Label>
        <Input id="file" type="file" accept={pdfOnly ? "application/pdf" : "application/pdf,image/*"} onChange={(e) => setFile(e.target.files?.[0] ?? null)} required />
      </div>
      <QRStyleFields style={style} onChange={setStyle} />
      <PixelFields pixels={pixels} onChange={setPixels} showUtm={false} />
      <Button type="submit" disabled={loading}>{loading ? "Enviando..." : "Criar QR Code"}</Button>
    </form>
  );
}

function VCardForm({ style, setStyle, pixels, setPixels, folderId, tagIds, onCreated }: FormCtx) {
  const [title, setTitle] = useState("");
  const [v, setV] = useState<VCardData>({ name: "" });
  const [loading, setLoading] = useState(false);

  const set = (k: keyof VCardData) => (val: string) => setV((s) => ({ ...s, [k]: val }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const short = await insertRow({
        title,
        type: "vcard",
        destination_url: buildInternalUrl(`/vcard/`),
        vcard_data: v, style, pixels, folderId, tagIds,
      });
      await supabase.from("qr_links").update({
        destination_url: buildInternalUrl(`/vcard/${short}`),
      }).eq("short_id", short);
      onCreated({ shortId: short, style, title });
      toast.success("QR Code vCard criado!");
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Nome interno" placeholder="Meu cartão" value={title} onChange={setTitle} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome completo" value={v.name} onChange={set("name")} />
        <Field label="Cargo" value={v.title ?? ""} onChange={set("title")} required={false} />
        <Field label="Telefone" value={v.phone ?? ""} onChange={set("phone")} required={false} />
        <Field label="Email" type="email" value={v.email ?? ""} onChange={set("email")} required={false} />
        <Field label="Empresa" value={v.company ?? ""} onChange={set("company")} required={false} />
        <Field label="Site" value={v.website ?? ""} onChange={set("website")} required={false} />
      </div>
      <QRStyleFields style={style} onChange={setStyle} />
      <PixelFields pixels={pixels} onChange={setPixels} showUtm={false} />
      <Button type="submit" disabled={loading}>{loading ? "Criando..." : "Criar QR Code"}</Button>
    </form>
  );
}

function FlowForm({ folderId, tagIds }: { folderId: string | null; tagIds: string[] }) {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return toast.error("Digite um nome para o fluxo");
    setLoading(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Não autenticado");
      const short_id = generateShortId();
      const { data: inserted, error } = await (supabase.from("qr_links") as any).insert({
        user_id: u.user.id,
        title: title.trim(),
        type: "flow",
        short_id,
        destination_url: buildInternalUrl(`/f/${short_id}`),
        folder_id: folderId ?? null,
      }).select("id").single();
      if (error) throw error;
      if (tagIds.length > 0 && inserted?.id) {
        try { await setQrTags(inserted.id as string, tagIds); } catch { /* non-fatal */ }
      }
      toast.success("Fluxo criado! Configure os blocos abaixo.");
      navigate({ to: "/flow-builder/$qrId", params: { qrId: inserted.id as string } });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-6 max-w-md">
      <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground space-y-1">
        <p className="font-medium text-foreground">O que é um Fluxo Operacional?</p>
        <p>Um QR Code que, ao ser escaneado, executa uma sequência de blocos configuráveis: validação de GPS, senha, formulário e mensagem final.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="flow-title">Nome do fluxo</Label>
        <Input id="flow-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Checklist de Inspeção" required />
      </div>
      <Button type="submit" disabled={loading}>
        <Workflow className="mr-2 h-4 w-4" />
        {loading ? "Criando…" : "Criar fluxo e abrir editor"}
      </Button>
    </form>
  );
}

function Success({ created, reset }: { created: NonNullable<Created>; reset: () => void }) {
  const url = buildQrUrl(created.shortId);
  const qrValue = created.qrValue ?? url;
  const isStatic = !!created.qrValue;
  return (
    <div className="space-y-6">
      <Link to="/dashboard" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="mr-1 h-4 w-4" /> Voltar ao dashboard
      </Link>
      <Card className="p-8">
        <div className="grid items-center gap-8 md:grid-cols-2">
          <div>
            <h2 className="text-2xl font-semibold">QR Code pronto!</h2>
            <p className="mt-1 text-sm text-muted-foreground">{created.title}</p>
            {isStatic ? (
              <p className="mt-6 rounded-lg border border-dashed border-border bg-muted/40 p-3 text-xs text-muted-foreground">
                Este é um QR Code <strong>estático</strong>: o conteúdo está embutido no próprio código. Para alterá-lo, gere um novo QR.
              </p>
            ) : (
              <div className="mt-6 space-y-2">
                <Label>Link curto</Label>
                <div className="flex gap-2">
                  <Input readOnly value={url} />
                  <Button variant="outline" onClick={() => { navigator.clipboard.writeText(url); toast.success("Copiado"); }}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
            <div className="mt-6 flex gap-2">
              <Button onClick={reset} variant="outline">Criar outro</Button>
              <Link to="/dashboard"><Button>Ir para o dashboard</Button></Link>
            </div>
          </div>
          <div className="flex justify-center">
            <QRCodePreview value={qrValue} color={created.style.color} bgColor={created.style.bgColor} logoUrl={created.style.logoUrl} frameStyle={created.style.frameStyle} frameText={created.style.frameText ?? null} name={created.title} size={240} />
          </div>
        </div>
      </Card>
    </div>
  );
}