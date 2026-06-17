import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { firePixels } from "@/lib/firePixels";
import { injectUtm, type PixelConfig } from "@/lib/qr";
import { QrCode } from "lucide-react";
import { resolveRoutingForShort } from "@/lib/routing.functions";
import { PasswordGate } from "@/components/flow/runner/PasswordGate";

export const Route = createFileRoute("/r/$shortId")({
  component: Redirector,
});

type UIState = "loading" | "password" | "redirecting" | "error";

function Redirector() {
  const { shortId } = Route.useParams();
  const [uiState, setUiState] = useState<UIState>("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [title, setTitle] = useState<string | null>(null);
  const [passwordHash, setPasswordHash] = useState<string>("");
  const proceedRef = useRef<(() => Promise<void>) | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error: err } = await supabase.rpc("resolve_qr", { p_short_id: shortId });
      if (cancelled) return;
      if (err || !data || data.length === 0) {
        setErrorMsg("QR Code não encontrado"); setUiState("error"); return;
      }
      const row = data[0] as any;
      if (!row.active) {
        setErrorMsg("Este QR Code foi pausado pelo autor."); setUiState("error"); return;
      }
      setTitle(row.title);

      const proceed = async () => {
        if (cancelled) return;
        let geo: { lat: number; lng: number } | null = null;
        try {
          geo = await new Promise<{ lat: number; lng: number } | null>((resolve) => {
            if (!navigator.geolocation) return resolve(null);
            const timer = setTimeout(() => resolve(null), 3000);
            navigator.geolocation.getCurrentPosition(
              (p) => { clearTimeout(timer); resolve({ lat: p.coords.latitude, lng: p.coords.longitude }); },
              () => { clearTimeout(timer); resolve(null); },
              { maximumAge: 60000, timeout: 3000 },
            );
          });
        } catch { /* ignore */ }
        try {
          const ruled = await resolveRoutingForShort({
            data: { shortId, lat: geo?.lat ?? null, lng: geo?.lng ?? null, nowIso: new Date().toISOString() },
          });
          if (ruled.action === "block") {
            setErrorMsg("Acesso bloqueado por regra contextual."); setUiState("error"); return;
          }
          if (ruled.action === "redirect" && ruled.destination_url) {
            window.location.replace(ruled.destination_url); return;
          }
        } catch { /* fall through to default behavior */ }

        const pixels: PixelConfig = {
          ga4Id: row.ga4_id, gtmId: row.gtm_id, metaPixelId: row.meta_pixel_id,
          tiktokPixelId: row.tiktok_pixel_id, linkedinPartnerId: row.linkedin_partner_id,
          twitterPixelId: row.twitter_pixel_id, pinterestTagId: row.pinterest_tag_id,
          addUtm: row.add_utm,
        };
        const firing = firePixels(pixels);
        fetch("/api/public/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ short_id: shortId, referrer: document.referrer || null }),
          keepalive: true,
        }).catch(() => {});

        let dest: string;
        if (row.type === "vcard") dest = `/vcard/${shortId}`;
        else if (row.type === "links") dest = `/links/${shortId}`;
        else if (row.type === "flow") dest = `/f/${shortId}`;
        else dest = row.add_utm ? injectUtm(row.destination_url, row.type, shortId) : row.destination_url;

        await firing;
        if (cancelled) return;
        window.location.replace(dest);
      };

      if (row.password_enabled && row.password_hash) {
        setPasswordHash(row.password_hash);
        proceedRef.current = proceed;
        setUiState("password");
      } else {
        await proceed();
      }
    })();
    return () => { cancelled = true; };
  }, [shortId]);

  const onPasswordPass = async () => {
    setUiState("redirecting");
    if (proceedRef.current) await proceedRef.current();
  };

  if (uiState === "password") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
        <div className="w-full max-w-sm">
          <div className="mb-4 flex justify-center">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary text-primary-foreground">
              <QrCode className="h-6 w-6" />
            </div>
          </div>
          {title && <p className="mb-2 text-center text-sm font-medium text-foreground">{title}</p>}
          <PasswordGate config={{ password_hash: passwordHash }} onPass={onPasswordPass} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6">
      <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary text-primary-foreground">
        <QrCode className="h-6 w-6" />
      </div>
      {errorMsg ? (
        <p className="text-sm text-muted-foreground">{errorMsg}</p>
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