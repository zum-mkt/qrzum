import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { verifyPresenceProof } from "@/lib/presence.functions";
import { Card } from "@/components/ui/card";
import { CheckCircle2, XCircle, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/proof/$id")({
  component: ProofPage,
});

function ProofPage() {
  const { id } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["proof", id],
    queryFn: () => verifyPresenceProof({ data: { id } }),
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg space-y-4 p-6">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold">Certificado de Presença</h1>
        </div>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Verificando…</p>
        ) : !data || !data.valid ? (
          <div className="flex items-center gap-2 text-destructive">
            <XCircle className="h-5 w-5" />
            <p className="text-sm">Certificado inválido ou inexistente.</p>
          </div>
        ) : (
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">Assinatura válida</span>
            </div>
            <dl className="grid grid-cols-3 gap-2 rounded-lg bg-muted/40 p-3 text-xs">
              <dt className="text-muted-foreground">Data</dt>
              <dd className="col-span-2 font-mono">{new Date(data.proof!.scanned_at).toLocaleString()}</dd>
              <dt className="text-muted-foreground">Local</dt>
              <dd className="col-span-2 font-mono">{data.proof!.lat.toFixed(6)}, {data.proof!.lng.toFixed(6)}</dd>
              <dt className="text-muted-foreground">Precisão</dt>
              <dd className="col-span-2 font-mono">±{Math.round(data.proof!.accuracy_m)} m</dd>
              <dt className="text-muted-foreground">Nonce</dt>
              <dd className="col-span-2 truncate font-mono">{data.proof!.nonce}</dd>
              <dt className="text-muted-foreground">Assinatura</dt>
              <dd className="col-span-2 truncate font-mono">{data.proof!.signature.slice(0, 32)}…</dd>
            </dl>
          </div>
        )}
      </Card>
    </div>
  );
}