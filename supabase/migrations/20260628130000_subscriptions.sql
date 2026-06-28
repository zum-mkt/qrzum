-- Subscriptions + payment tracking for Mercado Pago integration

-- 1. Add price fields to pricing_plans
ALTER TABLE public.pricing_plans
  ADD COLUMN IF NOT EXISTS price_monthly integer,  -- centavos BRL (ex: 9990 = R$ 99,90)
  ADD COLUMN IF NOT EXISTS price_annual  integer;  -- centavos BRL (ex: 99900 = R$ 999,00)

-- 2. User subscriptions
CREATE TABLE public.user_subscriptions (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid NOT NULL,
  plan_id              uuid NOT NULL REFERENCES public.pricing_plans(id),
  period               text NOT NULL CHECK (period IN ('monthly', 'annual')),
  status               text NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending', 'authorized', 'paused', 'cancelled')),
  mp_subscription_id   text UNIQUE,
  mp_payer_email       text,
  current_period_end   timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON public.user_subscriptions (user_id);
CREATE INDEX ON public.user_subscriptions (mp_subscription_id);

-- 3. Payment history
CREATE TABLE public.subscription_payments (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id  uuid REFERENCES public.user_subscriptions(id) ON DELETE SET NULL,
  user_id          uuid,
  mp_payment_id    text UNIQUE,
  amount           integer NOT NULL,  -- centavos BRL
  status           text NOT NULL,     -- approved, pending, rejected, refunded
  paid_at          timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON public.subscription_payments (user_id);

-- 4. RLS
ALTER TABLE public.user_subscriptions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;

-- Users can only read their own data
CREATE POLICY "users read own subscriptions"
  ON public.user_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users read own payments"
  ON public.subscription_payments FOR SELECT
  USING (auth.uid() = user_id);

-- Service role (used by server functions) can do everything
CREATE POLICY "service role manages subscriptions"
  ON public.user_subscriptions FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "service role manages payments"
  ON public.subscription_payments FOR ALL
  USING (auth.role() = 'service_role');
