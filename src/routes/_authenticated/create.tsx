import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, type FormEvent } from "react";
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
  buildInternalUrl, buildPixString, buildIcsString,
  type VCardData, type LinksData, type WifiAuth, type FrameStyle,
  type PixelConfig, type PixData, type CalendarData, emptyPixelConfig,
} from "@/lib/qr";
import { QRCodePreview } from "@/components/QRCodePreview";
import { QRStyleFields, defaultStyle, type QRStyle } from "@/components/QRStyleFields";
import { PixelFields } from "@/components/PixelFields";
import { FolderTagPicker } from "@/components/FolderTagPicker";
import { setQrTags } from "@/lib/organize";
import {
  Copy, Link as LinkIcon, FileUp, Contact, ArrowLeft,
  MessageCircle, Wifi, Video, ListOrdered, Plus, Trash2,
  FileText, Workflow, QrCode, Calendar,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/create")({
  head: () => ({ meta: [{ title: "Criar QR Code — zum" }] }),
  component: Create,
});

type QrType = "link" | "file" | "vcard" | "whatsapp" | "wifi" | "video" | "links" | "pdf" | "flow" | "pix" | "calendar";
type Created = {
  shortId: string;
  title: string;
  style: QRStyle;
  qrValue?: string;
} | null;

const PREVIEW_PLACEHOLDER = "https://zum.qr/preview";

function Create() {
  const [created, setCreated] = useState<Created>(null);
  const [style, setStyle] = useState<QRStyle>(defaultStyle());
  const [pixels, setPixels] = useState<PixelConfig>(emptyPixelConfig);
  const [folderId, setFolderId] = useState<string | null>(null);
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [previewValue, setPreviewValue] = useState(PREVIEW_PLACEHOLDER);

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

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* Form panel */}
        <Card className="min-w-0 flex-1 p-6">
          <Tabs defaultValue="link">
            <div className="overflow-x-auto pb-1">
              <TabsList className="inline-flex h-auto w-max gap-0.5">
                <TabsTrigger value="link" className="gap-1 whitespace-nowrap"><LinkIcon className="h-3.5 w-3.5" /> Link</TabsTrigger>
                <TabsTrigger value="whatsapp" className="gap-1 whitespace-nowrap"><MessageCircle className="h-3.5 w-3.5" /> WhatsApp</TabsTrigger>
                <TabsTrigger value="vcard" className="gap-1 whitespace-nowrap"><Contact className="h-3.5 w-3.5" /> vCard</TabsTrigger>
                <TabsTrigger value="pdf" className="gap-1 whitespace-nowrap"><FileText className="h-3.5 w-3.5" /> PDF</TabsTrigger>
                <TabsTrigger value="file" className="gap-1 whitespace-nowrap"><FileUp className="h-3.5 w-3.5" /> Arquivo</TabsTrigger>
                <TabsTrigger value="links" className="gap-1 whitespace-nowrap"><ListOrdered className="h-3.5 w-3.5" /> Links</TabsTrigger>
                <TabsTrigger value="video" className="gap-1 whitespace-nowrap"><Video className="h-3.5 w-3.5" /> Vídeo</TabsTrigger>
                <TabsTrigger value="wifi" className="gap-1 whitespace-nowrap"><Wifi className="h-3.5 w-3.5" /> WiFi</TabsTrigger>
                <TabsTrigger value="pix" className="gap-1 whitespace-nowrap"><QrCode className="h-3.5 w-3.5" /> PIX</TabsTrigger>
                <TabsTrigger value="calendar" className="gap-1 whitespace-nowrap"><Calendar className="h-3.5 w-3.5" /> Evento</TabsTrigger>
                <TabsTrigger value="flow" className="gap-1 whitespace-nowrap"><Workflow className="h-3.5 w-3.5" /> Fluxo</TabsTrigger>
              </TabsList>
            </div>
            <div className="mb-6 mt-4">
              <FolderTagPicker folderId={folderId} onFolderChange={setFolderId} tagIds={tagIds} onTagsChange={setTagIds} />
            </div>
            <TabsContent value="link"><LinkForm style={style} setStyle={setStyle} pixels={pixels} setPixels={setPixels} folderId={folderId} tagIds={tagIds} onCreated={setCreated} onPreviewChange={setPreviewValue} /></TabsContent>
            <TabsContent value="whatsapp"><WhatsAppForm style={style} setStyle={setStyle} pixels={pixels} setPixels={setPixels} folderId={folderId} tagIds={tagIds} onCreated={setCreated} onPreviewChange={setPreviewValue} /></TabsContent>
            <TabsContent value="vcard"><VCardForm style={style} setStyle={setStyle} pixels={pixels} setPixels={setPixels} folderId={folderId} tagIds={tagIds} onCreated={setCreated} onPreviewChange={setPreviewValue} /></TabsContent>
            <TabsContent value="pdf"><FileForm style={style} setStyle={setStyle} pixels={pixels} setPixels={setPixels} folderId={folderId} tagIds={tagIds} onCreated={setCreated} onPreviewChange={setPreviewValue} pdfOnly /></TabsContent>
            <TabsContent value="file"><FileForm style={style} setStyle={setStyle} pixels={pixels} setPixels={setPixels} folderId={folderId} tagIds={tagIds} onCreated={setCreated} onPreviewChange={setPreviewValue} /></TabsContent>
            <TabsContent value="links"><LinksForm style={style} setStyle={setStyle} pixels={pixels} setPixels={setPixels} folderId={folderId} tagIds={tagIds} onCreated={setCreated} onPreviewChange={setPreviewValue} /></TabsContent>
            <TabsContent value="video"><VideoForm style={style} setStyle={setStyle} pixels={pixels} setPixels={setPixels} folderId={folderId} tagIds={tagIds} onCreated={setCreated} onPreviewChange={setPreviewValue} /></TabsContent>
            <TabsContent value="wifi"><WifiForm style={style} setStyle={setStyle} pixels={pixels} setPixels={setPixels} folderId={folderId} tagIds={tagIds} onCreated={setCreated} onPreviewChange={setPreviewValue} /></TabsContent>
            <TabsContent value="pix"><PixForm style={style} setStyle={setStyle} pixels={pixels} setPixels={setPixels} folderId={folderId} tagIds={tagIds} onCreated={setCreated} onPreviewChange={setPreviewValue} /></TabsContent>
            <TabsContent value="calendar"><CalendarForm style={style} setStyle={setStyle} pixels={pixels} setPixels={setPixels} folderId={folderId} tagIds={tagIds} onCreated={setCreated} onPreviewChange={setPreviewValue} /></TabsContent>
            <TabsContent value="flow"><FlowForm folderId={folderId} tagIds={tagIds} /></TabsContent>
          </Tabs>
        </Card>

        {/* Live preview panel */}
        <div className="shrink-0 lg:sticky lg:top-20 lg:w-56 xl:w-64">
          <Card className="p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Pré-visualização
            </p>
            <div className="flex justify-center">
              <QRCodePreview
                value={previewValue || PREVIEW_PLACEHOLDER}
                color={style.color}
                bgColor={style.bgColor}
                logoUrl={style.logoUrl}
                frameStyle={style.frameStyle}
                frameText={style.frameText ?? null}
                name="Preview"
                size={200}
              />
            </div>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Atualiza conforme você personaliza
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ─── shared types ─── */

type FormCtx = {
  style: QRStyle; setStyle: (s: QRStyle) => void;
  pixels: PixelConfig; setPixels: (p: PixelConfig) => void;
  folderId: string | null;
  tagIds: string[];
  onCreated: (c: Created) => void;
  onPreviewChange: (v: string) => void;
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
  label, value, onChange, type = "text", placeholder, required = true, hint,
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; required?: boolean; hint?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} required={required} />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/* ─── forms ─── */

function LinkForm({ style, setStyle, pixels, setPixels, folderId, tagIds, onCreated, onPreviewChange }: FormCtx) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { onPreviewChange(url || PREVIEW_PLACEHOLDER); }, [url]);

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setLoading(true);
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

function VideoForm({ style, setStyle, pixels, setPixels, folderId, tagIds, onCreated, onPreviewChange }: FormCtx) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { onPreviewChange(url || PREVIEW_PLACEHOLDER); }, [url]);

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setLoading(true);
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
      <Field label="URL do vídeo" placeholder="https://youtube.com/watch?v=..." value={url} onChange={setUrl} type="url"
        hint="Cole o link do YouTube, Vimeo ou qualquer player de vídeo." />
      <QRStyleFields style={style} onChange={setStyle} />
      <PixelFields pixels={pixels} onChange={setPixels} showUtm />
      <Button type="submit" disabled={loading}>{loading ? "Criando..." : "Criar QR Code"}</Button>
    </form>
  );
}

function WhatsAppForm({ style, setStyle, pixels, setPixels, folderId, tagIds, onCreated, onPreviewChange }: FormCtx) {
  const [title, setTitle] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    onPreviewChange(phone ? buildWhatsAppUrl(phone, message || undefined) : PREVIEW_PLACEHOLDER);
  }, [phone, message]);

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setLoading(true);
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

function WifiForm({ style, setStyle, pixels, setPixels, folderId, tagIds, onCreated, onPreviewChange }: FormCtx) {
  const [title, setTitle] = useState("");
  const [ssid, setSsid] = useState("");
  const [password, setPassword] = useState("");
  const [auth, setAuth] = useState<WifiAuth>("WPA");
  const [hidden, setHidden] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (ssid) onPreviewChange(buildWifiString(ssid, password, auth, hidden));
    else onPreviewChange(PREVIEW_PLACEHOLDER);
  }, [ssid, password, auth, hidden]);

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setLoading(true);
    try {
      const wifi = buildWifiString(ssid, password, auth, hidden);
      const short = await insertRow({
        title, type: "wifi", destination_url: wifi,
        vcard_data: { ssid, password, auth, hidden }, style, pixels, folderId, tagIds,
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
          <select value={auth} onChange={(e) => setAuth(e.target.value as WifiAuth)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
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
      <p className="text-xs text-muted-foreground">QR Code estático: conecta direto na rede ao escanear.</p>
      <Button type="submit" disabled={loading}>{loading ? "Criando..." : "Criar QR Code"}</Button>
    </form>
  );
}

function LinksForm({ style, setStyle, pixels, setPixels, folderId, tagIds, onCreated, onPreviewChange }: FormCtx) {
  const [title, setTitle] = useState("");
  const [bio, setBio] = useState("");
  const [items, setItems] = useState<{ label: string; url: string }[]>([{ label: "", url: "" }]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { onPreviewChange(buildInternalUrl("/links/preview")); }, []);

  const update = (i: number, key: "label" | "url", val: string) =>
    setItems((s) => s.map((it, idx) => (idx === i ? { ...it, [key]: val } : it)));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const cleaned = items.filter((it) => it.label.trim() && it.url.trim());
    if (cleaned.length === 0) return toast.error("Adicione ao menos um link");
    setLoading(true);
    try {
      const payload: LinksData = { bio: bio || undefined, items: cleaned };
      const short = await insertRow({ title, type: "links", destination_url: buildInternalUrl("/links/"), vcard_data: payload, style, pixels, folderId, tagIds });
      await supabase.from("qr_links").update({ destination_url: buildInternalUrl(`/links/${short}`) }).eq("short_id", short);
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

const MAX_PDF_MB = 10;
const MAX_FILE_MB = 25;

function FileForm({ style, setStyle, pixels, setPixels, folderId, tagIds, onCreated, onPreviewChange, pdfOnly }: FormCtx & { pdfOnly?: boolean }) {
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const maxMb = pdfOnly ? MAX_PDF_MB : MAX_FILE_MB;

  useEffect(() => { onPreviewChange(PREVIEW_PLACEHOLDER); }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) return toast.error("Selecione um arquivo");
    if (file.size > maxMb * 1024 * 1024) return toast.error(`Arquivo muito grande. Máximo: ${maxMb} MB`);
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
        <Label htmlFor="file">{pdfOnly ? "PDF" : "Arquivo (PDF / imagem)"}</Label>
        <Input id="file" type="file" accept={pdfOnly ? "application/pdf" : "application/pdf,image/*"} onChange={(e) => setFile(e.target.files?.[0] ?? null)} required />
        <p className="text-xs text-muted-foreground">
          Tamanho máximo: <strong>{maxMb} MB</strong>
          {pdfOnly ? " · Apenas arquivos PDF" : " · PDF ou imagem (JPEG, PNG, WebP)"}
        </p>
      </div>
      <QRStyleFields style={style} onChange={setStyle} />
      <PixelFields pixels={pixels} onChange={setPixels} showUtm={false} />
      <Button type="submit" disabled={loading}>{loading ? "Enviando..." : "Criar QR Code"}</Button>
    </form>
  );
}

function VCardForm({ style, setStyle, pixels, setPixels, folderId, tagIds, onCreated, onPreviewChange }: FormCtx) {
  const [title, setTitle] = useState("");
  const [v, setV] = useState<VCardData>({ name: "" });
  const [loading, setLoading] = useState(false);

  const set = (k: keyof VCardData) => (val: string) => setV((s) => ({ ...s, [k]: val }));

  useEffect(() => { onPreviewChange(buildInternalUrl("/vcard/preview")); }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setLoading(true);
    try {
      const short = await insertRow({ title, type: "vcard", destination_url: buildInternalUrl("/vcard/"), vcard_data: v, style, pixels, folderId, tagIds });
      await supabase.from("qr_links").update({ destination_url: buildInternalUrl(`/vcard/${short}`) }).eq("short_id", short);
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

/* ─── PIX form ─── */

function PixForm({ style, setStyle, pixels, setPixels, folderId, tagIds, onCreated, onPreviewChange }: FormCtx) {
  const [title, setTitle] = useState("");
  const [key, setKey] = useState("");
  const [keyType, setKeyType] = useState<PixData["keyType"]>("evp");
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [amount, setAmount] = useState("");
  const [txId, setTxId] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (key && name && city) {
      try {
        const pix = buildPixString({ key, keyType, name, city, amount: amount ? parseFloat(amount) : undefined, txId: txId || undefined });
        onPreviewChange(pix);
      } catch { onPreviewChange(PREVIEW_PLACEHOLDER); }
    } else {
      onPreviewChange(PREVIEW_PLACEHOLDER);
    }
  }, [key, keyType, name, city, amount, txId]);

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setLoading(true);
    try {
      const pixStr = buildPixString({ key, keyType, name, city, amount: amount ? parseFloat(amount) : undefined, txId: txId || undefined });
      const short = await insertRow({
        title, type: "pix", destination_url: pixStr,
        vcard_data: { key, keyType, name, city, amount: amount || null, txId: txId || null },
        style, pixels, folderId, tagIds,
      });
      onCreated({ shortId: short, style, title, qrValue: pixStr });
      toast.success("QR Code PIX criado!");
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  const KEY_HINTS: Record<PixData["keyType"], string> = {
    cpf: "Somente números, ex: 12345678901",
    cnpj: "Somente números, ex: 12345678000190",
    phone: "+5511999999999 (com DDI)",
    email: "email@dominio.com",
    evp: "Chave aleatória (UUID) gerada pelo banco",
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm text-foreground">
        <p className="font-medium">QR Code PIX (Copia e Cola)</p>
        <p className="mt-1 text-xs text-muted-foreground">Gera o código EMV compatível com todos os bancos brasileiros. QR estático — escaneável direto pelo app do banco.</p>
      </div>
      <Field label="Nome interno" placeholder="PIX Loja Centro" value={title} onChange={setTitle} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Tipo de chave</Label>
          <select value={keyType} onChange={(e) => setKeyType(e.target.value as PixData["keyType"])}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="cpf">CPF</option>
            <option value="cnpj">CNPJ</option>
            <option value="phone">Telefone</option>
            <option value="email">Email</option>
            <option value="evp">Chave aleatória (EVP)</option>
          </select>
        </div>
        <Field label="Chave PIX" placeholder={KEY_HINTS[keyType]} value={key} onChange={setKey}
          hint={KEY_HINTS[keyType]} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome do recebedor" placeholder="João da Silva" value={name} onChange={setName}
          hint="Máximo 25 caracteres" />
        <Field label="Cidade" placeholder="São Paulo" value={city} onChange={setCity}
          hint="Máximo 15 caracteres" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Valor (R$) — opcional" placeholder="0,00 (deixe em branco para valor livre)" value={amount} onChange={setAmount} type="number" required={false}
          hint="Deixe vazio para valor aberto" />
        <Field label="TxID — opcional" placeholder="pedido123" value={txId} onChange={setTxId} required={false}
          hint="Identificador da transação (alfanumérico)" />
      </div>
      <QRStyleFields style={style} onChange={setStyle} />
      <p className="text-xs text-muted-foreground">
        QR Code estático: o valor EMV fica embutido no próprio código.
      </p>
      <Button type="submit" disabled={loading}>{loading ? "Criando..." : "Criar QR Code PIX"}</Button>
    </form>
  );
}

/* ─── Calendar / .ics form ─── */

function CalendarForm({ style, setStyle, pixels, setPixels, folderId, tagIds, onCreated, onPreviewChange }: FormCtx) {
  const [title, setTitle] = useState("");
  const [eventTitle, setEventTitle] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (eventTitle && start && end) {
      try {
        const ics = buildIcsString({ title: eventTitle, start, end, location: location || undefined, description: description || undefined });
        onPreviewChange(ics);
      } catch { onPreviewChange(PREVIEW_PLACEHOLDER); }
    } else {
      onPreviewChange(PREVIEW_PLACEHOLDER);
    }
  }, [eventTitle, start, end, location, description]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!start || !end) return toast.error("Informe início e fim do evento");
    if (new Date(end) <= new Date(start)) return toast.error("O fim deve ser depois do início");
    setLoading(true);
    try {
      const icsContent = buildIcsString({ title: eventTitle, start, end, location: location || undefined, description: description || undefined });
      const calData: CalendarData = { title: eventTitle, start, end, location: location || undefined, description: description || undefined };

      // Upload .ics to storage so the QR encodes a stable HTTPS URL
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Não autenticado");
      const blob = new Blob([icsContent], { type: "text/calendar" });
      const file = new File([blob], `event-${Date.now()}.ics`, { type: "text/calendar" });
      const path = `${u.user.id}/calendar/${Date.now()}.ics`;
      const { error: upErr } = await supabase.storage.from("qr_files").upload(path, file, { upsert: false, contentType: "text/calendar" });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("qr_files").getPublicUrl(path);

      const short = await insertRow({
        title: title || eventTitle,
        type: "calendar",
        destination_url: pub.publicUrl,
        vcard_data: calData as unknown as Record<string, unknown>,
        style, pixels, folderId, tagIds,
      });
      onCreated({ shortId: short, style, title: title || eventTitle });
      toast.success("QR Code de evento criado!");
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
        Ao escanear, o dispositivo abre o convite no Google Calendar, Apple Calendar ou Outlook.
      </div>
      <Field label="Nome interno" placeholder="Evento Feira 2026" value={title} onChange={setTitle} required={false} />
      <Field label="Título do evento" placeholder="Reunião de Kickoff" value={eventTitle} onChange={setEventTitle} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Início</Label>
          <Input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label>Fim</Label>
          <Input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} required />
        </div>
      </div>
      <Field label="Local (opcional)" placeholder="Av. Paulista, 1000 — São Paulo" value={location} onChange={setLocation} required={false} />
      <div className="space-y-2">
        <Label>Descrição (opcional)</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Detalhes do evento..." />
      </div>
      <QRStyleFields style={style} onChange={setStyle} />
      <Button type="submit" disabled={loading}>{loading ? "Criando..." : "Criar QR Code de Evento"}</Button>
    </form>
  );
}

/* ─── Flow form ─── */

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
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  return (
    <form onSubmit={submit} className="max-w-md space-y-6">
      <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground space-y-1">
        <p className="font-medium text-foreground">O que é um Fluxo Operacional?</p>
        <p>Um QR Code que executa uma sequência de blocos: GPS, senha, formulário e mensagem final.</p>
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

/* ─── Success screen ─── */

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
                QR Code <strong>estático</strong>: o conteúdo está embutido no código. Para alterar, gere um novo QR.
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
            <QRCodePreview value={qrValue} color={created.style.color} bgColor={created.style.bgColor}
              logoUrl={created.style.logoUrl} frameStyle={created.style.frameStyle}
              frameText={created.style.frameText ?? null} name={created.title} size={240} />
          </div>
        </div>
      </Card>
    </div>
  );
}
