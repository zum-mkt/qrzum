import { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import { useSubscription } from "@/contexts/SubscriptionContext";

type Props = {
  featureKey: string;
  children: ReactNode;
  /** Label shown in the upgrade prompt. Defaults to the feature key. */
  featureLabel?: string;
  /** Minimum plan name required. Defaults to "Pro". */
  requiredPlan?: string;
};

export function FeatureGate({ featureKey, children, featureLabel, requiredPlan = "Pro" }: Props) {
  const { hasFeature, isLoading } = useSubscription();

  if (isLoading) return null;
  if (hasFeature(featureKey)) return <>{children}</>;

  return (
    <div className="flex min-h-80 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card p-10 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-secondary">
        <Lock className="h-6 w-6 text-muted-foreground" />
      </div>
      <h2 className="text-lg font-semibold text-foreground">
        {featureLabel ?? featureKey} — plano {requiredPlan} ou superior
      </h2>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Esta funcionalidade não está disponível no seu plano atual. Faça upgrade para desbloquear.
      </p>
      <Link to="/plans" className="mt-6">
        <Button>Ver planos</Button>
      </Link>
    </div>
  );
}
