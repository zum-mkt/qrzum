import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/q/$shortId")({
  component: Redirector,
});

function Redirector() {
  const { shortId } = Route.useParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.rpc("resolve_qr", { p_short_id: shortId });
      if (error || !data || data.length === 0) {
        setError("QR Code não encontrado");
        return;
      }
      const row = data[0];
      if (!row.active) {
        setError("Este QR Code foi pausado pelo autor.");
        return;
      }
      if (row.type === "vcard") {
        window.location.replace(`/vcard/${shortId}`);
      } else if (row.type === "links") {
        window.location.replace(`/links/${shortId}`);
      } else {
        window.location.replace(row.destination_url);
      }
    })();
  }, [shortId]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      {error ? (
        <p className="text-sm text-muted-foreground">{error}</p>
      ) : (
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      )}
    </div>
  );
}