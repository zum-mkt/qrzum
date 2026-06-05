import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mail, Phone, Building2, Globe, Briefcase, Download } from "lucide-react";
import { buildVCard, type VCardData } from "@/lib/qr";
import { firePixels } from "@/lib/firePixels";

export const Route = createFileRoute("/vcard/$shortId")({
  component: VCardPage,
});

function VCardPage() {
  const { shortId } = Route.useParams();
  const [data, setData] = useState<VCardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.rpc("resolve_qr", { p_short_id: shortId });
      setLoading(false);
      if (error || !data?.[0]) return;
      if (!data[0].active) return;
      if (!data[0].vcard_data) return;
      setData(data[0].vcard_data as unknown as VCardData);
      const r = data[0] as any;
      firePixels({
        ga4Id: r.ga4_id, gtmId: r.gtm_id, metaPixelId: r.meta_pixel_id,
        tiktokPixelId: r.tiktok_pixel_id, linkedinPartnerId: r.linkedin_partner_id,
        twitterPixelId: r.twitter_pixel_id, pinterestTagId: r.pinterest_tag_id,
      });
      fetch("/api/public/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ short_id: shortId, referrer: document.referrer || null }),
        keepalive: true,
      }).catch(() => {});
    })();
  }, [shortId]);

  const save = () => {
    if (!data) return;
    const blob = new Blob([buildVCard(data)], { type: "text/vcard" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${data.name || "contact"}.vcf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <p className="text-muted-foreground">Contato não encontrado.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary p-4">
      <div className="mx-auto max-w-md pt-10">
        <Card className="overflow-hidden">
          <div className="bg-primary p-8 text-primary-foreground">
            <div className="mx-auto mb-3 grid h-20 w-20 place-items-center rounded-full bg-white/20 text-3xl font-semibold">
              {(data.name?.[0] ?? "?").toUpperCase()}
            </div>
            <h1 className="text-center text-2xl font-semibold">{data.name}</h1>
            {data.title && <p className="mt-1 text-center text-sm opacity-90">{data.title}</p>}
          </div>
          <div className="space-y-3 p-6">
            {data.company && <Row icon={<Building2 className="h-4 w-4" />}>{data.company}</Row>}
            {data.title && <Row icon={<Briefcase className="h-4 w-4" />}>{data.title}</Row>}
            {data.phone && <Row icon={<Phone className="h-4 w-4" />}><a href={`tel:${data.phone}`} className="hover:underline">{data.phone}</a></Row>}
            {data.email && <Row icon={<Mail className="h-4 w-4" />}><a href={`mailto:${data.email}`} className="hover:underline">{data.email}</a></Row>}
            {data.website && <Row icon={<Globe className="h-4 w-4" />}><a href={data.website} target="_blank" rel="noreferrer" className="hover:underline">{data.website}</a></Row>}
          </div>
          <div className="p-6 pt-0">
            <Button className="w-full" size="lg" onClick={save}>
              <Download className="mr-2 h-4 w-4" /> Salvar contato
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Row({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2 text-sm">
      <span className="text-primary">{icon}</span>
      <span className="text-foreground">{children}</span>
    </div>
  );
}