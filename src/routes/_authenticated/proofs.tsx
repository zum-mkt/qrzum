import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listMyPresenceProofs } from "@/lib/presence.functions";
import { Card } from "@/components/ui/card";
import { ShieldCheck } from "lucide-react";
import { FeatureGate } from "@/components/FeatureGate";

export const Route = createFileRoute("/_authenticated/proofs")({
  component: ProofsList,
});

function ProofsList() {
  return (
    <FeatureGate featureKey="proof_of_presence" featureLabel="Prova de Presença" requiredPlan="Enterprise">
      <ProofsContent />
    </FeatureGate>
  );
}

function ProofsContent() {
  const { data, isLoading } = useQuery({
    queryKey: ["my-proofs"],
    queryFn: () => listMyPresenceProofs(),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Provas de Presença</h1>
        <p className="text-sm text-muted-foreground">
          Certificados gerados quando alguém escaneou um dos seus QRs com prova ativa.
        </p>
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : !data || data.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          Nenhum certificado emitido ainda.
        </Card>
      ) : (
        <div className="space-y-2">
          {data.map((p: any) => (
            <Card key={p.id} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">{p.qr_links?.title ?? "(QR removido)"}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(p.scanned_at).toLocaleString()} · {p.lat.toFixed(4)}, {p.lng.toFixed(4)} · ±{Math.round(p.accuracy_m)}m
                  </p>
                </div>
              </div>
              <Link to="/proof/$id" params={{ id: p.id }} className="text-xs text-primary hover:underline">
                Ver certificado
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}