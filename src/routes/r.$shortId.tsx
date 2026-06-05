import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { firePixels } from "@/lib/firePixels";
import { injectUtm, type PixelConfig } from "@/lib/qr";
import { QrCode } from "lucide-react";

export const Route = createFileRoute("/r/$shortId")({
  component: Redirector,
});

function Redirector() {
  const { shortId } = Route.useParams();
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error: err } = await supabase.rpc("resolve_qr", { p_short_id: shortId });
      if (cancelled) return;
      if (err || !data || data.length === 0) {
        setError("QR Code não encontrado");
        return;
      }
      const row = data[0] as any;
      if (!row.active) {
        setError("Este QR Code foi pausado pelo autor.");
        return;
      }
      setTitle(row.title);

      const pixels: PixelConfig = {
        ga4Id: row.ga4_id, gtmId: row.gtm_id, metaPixelId: row.meta_pixel_id,
        tiktokPixelId: row.tiktok_pixel_id, linkedinPartnerId: row.linkedin_partner_id,
        twitterPixelId: row.twitter_pixel_id, pinterestTagId: row.pinterest_tag_id,
        addUtm: row.add_utm,
      };

      // Fire pixels + record scan in parallel; both have their own internal awaits.
      const firing = firePixels(pixels);
      fetch("/api/public/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ short_id: shortId, referrer: document.referrer || null }),
        keepalive: true,
      }).catch(() => {});

      // Compute destination
      let dest: string;
      if (row.type === "vcard") dest = `/vcard/${shortId}`;
      else if (row.type === "links") dest = `/links/${shortId}`;
      else dest = row.add_utm ? injectUtm(row.destination_url, row.type, shortId) : row.destination_url;

      await firing;
      if (cancelled) return;
      window.location.replace(dest);
    })();
    return () => { cancelled = true; };
  }, [shortId]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6">
      <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary text-primary-foreground">
        <QrCode className="h-6 w-6" />
      </div>
      {error ? (
        <p className="text-sm text-muted-foreground">{error}</p>
      ) : (
        <>
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">
            {title ? `Abrindo "${title}"...` : "Redirecionando..."}
          </p>
        </>
      )}
    </div>
  );
}