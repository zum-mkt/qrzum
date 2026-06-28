import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

const STARTER_PLAN_ID = "11111111-0000-0000-0000-000000000001";

type PlanInfo = { id: string; name: string; slug: string };

type FeatureMap = Record<string, { available: boolean; value: string }>;

type SubscriptionContextType = {
  plan: PlanInfo | null;
  isLoading: boolean;
  hasFeature: (key: string) => boolean;
  getFeatureValue: (key: string) => string;
  getQrLimit: () => number;
};

const SubscriptionContext = createContext<SubscriptionContextType>({
  plan: null,
  isLoading: true,
  hasFeature: () => false,
  getFeatureValue: () => "",
  getQrLimit: () => 5,
});

function parseLimit(value: string): number {
  if (!value || value.toLowerCase().includes("ilimitado")) return Infinity;
  const match = value.match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
}

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [plan, setPlan] = useState<PlanInfo | null>(null);
  const [features, setFeatures] = useState<FeatureMap>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setIsLoading(false); return; }

      // Try to find active subscription
      const { data: sub } = await supabase
        .from("user_subscriptions")
        .select("plan_id, pricing_plans(id, name, slug)")
        .eq("user_id", session.user.id)
        .in("status", ["authorized", "pending", "paused"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const planId = sub?.plan_id ?? STARTER_PLAN_ID;
      const planInfo = sub?.pricing_plans as unknown as PlanInfo ?? null;

      // If no subscription, fetch Starter plan info
      let resolvedPlan = planInfo;
      if (!resolvedPlan) {
        const { data: starterPlan } = await supabase
          .from("pricing_plans")
          .select("id, name, slug")
          .eq("id", STARTER_PLAN_ID)
          .maybeSingle();
        resolvedPlan = starterPlan as PlanInfo;
      }

      // Fetch features for this plan
      const { data: planFeatures } = await supabase
        .from("pricing_plan_features")
        .select("available, value, pricing_features(key)")
        .eq("plan_id", planId);

      const map: FeatureMap = {};
      for (const row of planFeatures ?? []) {
        const key = (row.pricing_features as unknown as { key: string } | null)?.key;
        if (key) map[key] = { available: row.available, value: row.value };
      }

      setPlan(resolvedPlan);
      setFeatures(map);
      setIsLoading(false);
    }
    load();
  }, []);

  const hasFeature = (key: string) => features[key]?.available ?? false;
  const getFeatureValue = (key: string) => features[key]?.value ?? "";
  const getQrLimit = () => parseLimit(getFeatureValue("qr_limit"));

  return (
    <SubscriptionContext.Provider value={{ plan, isLoading, hasFeature, getFeatureValue, getQrLimit }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export const useSubscription = () => useContext(SubscriptionContext);
