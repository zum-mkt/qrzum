-- Support Pix (one-off per cycle) as an alternative payment method alongside card preapproval

ALTER TABLE public.user_subscriptions
  ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'card'
    CHECK (payment_method IN ('card', 'pix'));
