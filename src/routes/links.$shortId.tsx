import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { LinksData } from "@/lib/qr";
import { firePixels } from "@/lib/firePixels";
import { LinksPageView } from "@/components/LinksPageView";

export const Route = createFileRoute("/links/$shortId")({
  component: LinksPage,
});

function LinksPage() {
  const { shortId } = Route.useParams();
  const [data, setData] = useState<{ title: string; links: LinksData } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: rows, error: err } = await supabase.rpc("resolve_qr", { p_short_id: shortId });
      setLoading(false);
      if (err || !rows || rows.length === 0) {
        setError("Página não encontrada");
        return;
      }
      const row = rows[0];
      if (!row.active) {
        setError("Este link foi pausado pelo autor.");
        return;
      }
      const payload = (row.vcard_data ?? {}) as unknown as LinksData;
      setData({ title: row.title, links: payload });
      const r = row as any;
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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <p className="text-muted-foreground">{error ?? "Página não encontrada."}</p>
      </div>
    );
  }

  return (
    <LinksPageView
      title={data.title}
      bio={data.links.bio}
      items={data.links.items ?? []}
      theme={data.links.theme}
    />
  );
}