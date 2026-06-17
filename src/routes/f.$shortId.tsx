import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { QrCode } from "lucide-react";
import { getFlowForRunner } from "@/lib/flow.functions";
import { FlowRunner } from "@/components/flow/FlowRunner";

export const Route = createFileRoute("/f/$shortId")({
  component: FlowPage,
});

function FlowPage() {
  const { shortId } = Route.useParams();

  const { data, isLoading } = useQuery({
    queryKey: ["flow-runner", shortId],
    queryFn: () => getFlowForRunner({ data: { shortId } }),
    retry: false,
    staleTime: 30_000,
  });

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center gap-2 border-b border-border px-4 py-3">
        <span className="grid h-7 w-7 place-items-center rounded-md bg-primary text-primary-foreground">
          <QrCode className="h-4 w-4" />
        </span>
        <span className="text-sm font-semibold">{data?.title ?? "zum"}</span>
      </header>

      <main className="mx-auto w-full max-w-lg flex-1 p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : !data ? (
          <div className="py-20 text-center text-sm text-muted-foreground">
            QR Code não encontrado ou inativo.
          </div>
        ) : (
          <FlowRunner
            qrId={data.qrId}
            title={data.title}
            definition={data.definition}
          />
        )}
      </main>
    </div>
  );
}
