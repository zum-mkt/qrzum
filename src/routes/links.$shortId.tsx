import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { ExternalLink } from "lucide-react";
import type { LinksData } from "@/lib/qr";

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
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary p-4">
      <div className="mx-auto max-w-md pt-12">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-foreground">{data.title}</h1>
          {data.links.bio && (
            <p className="mt-2 text-sm text-muted-foreground">{data.links.bio}</p>
          )}
        </div>
        <Card className="space-y-2 p-4">
          {(data.links.items ?? []).map((item, i) => (
            <a
              key={i}
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
            >
              <span>{item.label}</span>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </a>
          ))}
          {(data.links.items ?? []).length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">Nenhum link cadastrado.</p>
          )}
        </Card>
      </div>
    </div>
  );
}