import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { getFlowForBuilder } from "@/lib/flow.functions";
import { FlowBuilder } from "@/components/flow/FlowBuilder";
import { buildQrUrl } from "@/lib/qr";

export const Route = createFileRoute("/_authenticated/flow-builder/$qrId")({
  head: () => ({ meta: [{ title: "Flow Builder — zum" }] }),
  component: FlowBuilderPage,
});

function FlowBuilderPage() {
  const { qrId } = Route.useParams();

  const { data, isLoading } = useQuery({
    queryKey: ["flow-builder", qrId],
    queryFn: () => getFlowForBuilder({ data: { qrId } }),
    staleTime: 30_000,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/dashboard" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-1 h-4 w-4" /> Dashboard
          </Link>
          <span className="text-muted-foreground">/</span>
          <h1 className="text-lg font-semibold tracking-tight">
            {isLoading ? "Carregando…" : (data?.title ?? "Flow Builder")}
          </h1>
        </div>
        {data && (
          <a href={buildQrUrl(qrId)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ExternalLink className="h-3.5 w-3.5" /> Preview
          </a>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : !data ? (
        <p className="py-12 text-center text-sm text-muted-foreground">Fluxo não encontrado.</p>
      ) : (
        <FlowBuilder qrId={qrId} initialDefinition={data.definition} />
      )}
    </div>
  );
}
