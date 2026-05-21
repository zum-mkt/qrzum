import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { generateShortId, buildQrUrl, type VCardData } from "@/lib/qr";
import { QRCodePreview } from "@/components/QRCodePreview";
import { Copy, Link as LinkIcon, FileUp, Contact, ArrowLeft } from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/create")({
  head: () => ({ meta: [{ title: "Criar QR Code — QRFlow" }] }),
  component: Create,
});

type Created = { shortId: string; color: string; title: string } | null;

function Create() {
  const [created, setCreated] = useState<Created>(null);

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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="link"><LinkIcon className="mr-2 h-4 w-4" /> Link</TabsTrigger>
            <TabsTrigger value="file"><FileUp className="mr-2 h-4 w-4" /> Arquivo</TabsTrigger>
            <TabsTrigger value="vcard"><Contact className="mr-2 h-4 w-4" /> vCard</TabsTrigger>
          </TabsList>
          <TabsContent value="link" className="mt-6"><LinkForm onCreated={setCreated} /></TabsContent>
          <TabsContent value="file" className="mt-6"><FileForm onCreated={setCreated} /></TabsContent>
          <TabsContent value="vcard" className="mt-6"><VCardForm onCreated={setCreated} /></TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}

function ColorField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-2">
      <Label>Cor do QR Code</Label>
      <div className="flex items-center gap-3">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-10 w-14 cursor-pointer rounded border border-input bg-background" />
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="max-w-[140px]" />
      </div>
    </div>
  );
}

async function insertRow(args: {
  title: string;
  type: "link" | "file" | "vcard";
  destination_url: string;
  vcard_data?: VCardData;
  color: string;
}) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Não autenticado");
  const short_id = generateShortId();
  const { error } = await supabase.from("qr_links").insert({
    user_id: u.user.id,
    title: args.title,
    type: args.type,
    short_id,
    destination_url: args.destination_url,
    vcard_data: args.vcard_data ?? null,
    color: args.color,
  });
  if (error) throw error;
  return short_id;
}

function LinkForm({ onCreated }: { onCreated: (c: Created) => void }) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [color, setColor] = useState("#0f172a");
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const short = await insertRow({ title, type: "link", destination_url: url, color });
      onCreated({ shortId: short, color, title });
      toast.success("QR Code criado!");
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Nome interno" placeholder="Cardápio Mesa 12" value={title} onChange={setTitle} />
      <Field label="URL de destino" placeholder="https://..." value={url} onChange={setUrl} type="url" />
      <ColorField value={color} onChange={setColor} />
      <Button type="submit" disabled={loading}>{loading ? "Criando..." : "Criar QR Code"}</Button>
    </form>
  );
}

function FileForm({ onCreated }: { onCreated: (c: Created) => void }) {
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [color, setColor] = useState("#0f172a");
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
      const short = await insertRow({ title, type: "file", destination_url: pub.publicUrl, color });
      onCreated({ shortId: short, color, title });
      toast.success("QR Code criado!");
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Nome interno" placeholder="Manual do produto" value={title} onChange={setTitle} />
      <div className="space-y-2">
        <Label htmlFor="file">Arquivo (PDF/imagem)</Label>
        <Input id="file" type="file" accept="application/pdf,image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} required />
      </div>
      <ColorField value={color} onChange={setColor} />
      <Button type="submit" disabled={loading}>{loading ? "Enviando..." : "Criar QR Code"}</Button>
    </form>
  );
}

function VCardForm({ onCreated }: { onCreated: (c: Created) => void }) {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [v, setV] = useState<VCardData>({ name: "" });
  const [color, setColor] = useState("#0f172a");
  const [loading, setLoading] = useState(false);

  const set = (k: keyof VCardData) => (val: string) => setV((s) => ({ ...s, [k]: val }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const short = await insertRow({
        title,
        type: "vcard",
        destination_url: `${window.location.origin}/vcard/`, // updated after creating short
        vcard_data: v,
        color,
      });
      // Now patch destination_url to the proper vcard URL using the short_id
      await supabase.from("qr_links").update({ destination_url: `${window.location.origin}/vcard/${short}` }).eq("short_id", short);
      onCreated({ shortId: short, color, title });
      toast.success("QR Code vCard criado!");
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
    void navigate;
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Nome interno" placeholder="Meu cartão" value={title} onChange={setTitle} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome completo" value={v.name} onChange={set("name")} required />
        <Field label="Cargo" value={v.title ?? ""} onChange={set("title")} />
        <Field label="Telefone" value={v.phone ?? ""} onChange={set("phone")} />
        <Field label="Email" type="email" value={v.email ?? ""} onChange={set("email")} />
        <Field label="Empresa" value={v.company ?? ""} onChange={set("company")} />
        <Field label="Site" value={v.website ?? ""} onChange={set("website")} />
      </div>
      <ColorField value={color} onChange={setColor} />
      <Button type="submit" disabled={loading}>{loading ? "Criando..." : "Criar QR Code"}</Button>
    </form>
  );
}

function Field({ label, value, onChange, type = "text", placeholder, required = true }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; required?: boolean }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} required={required} />
    </div>
  );
}

function Success({ created, reset }: { created: NonNullable<Created>; reset: () => void }) {
  const url = buildQrUrl(created.shortId);
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
            <div className="mt-6 space-y-2">
              <Label>Link curto</Label>
              <div className="flex gap-2">
                <Input readOnly value={url} />
                <Button variant="outline" onClick={() => { navigator.clipboard.writeText(url); toast.success("Copiado"); }}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="mt-6 flex gap-2">
              <Button onClick={reset} variant="outline">Criar outro</Button>
              <Link to="/dashboard"><Button>Ir para o dashboard</Button></Link>
            </div>
          </div>
          <div className="flex justify-center">
            <QRCodePreview value={url} color={created.color} name={created.title} size={240} />
          </div>
        </div>
      </Card>
    </div>
  );
}