-- Flow definitions (one per QR of type "flow")
CREATE TABLE public.qr_flows (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_id      uuid NOT NULL REFERENCES public.qr_links(id) ON DELETE CASCADE,
  definition jsonb NOT NULL DEFAULT '{"blocks":[],"notifications":[]}',
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (qr_id)
);
ALTER TABLE public.qr_flows ENABLE ROW LEVEL SECURITY;

-- Owner: full access
CREATE POLICY qr_flows_owner ON public.qr_flows
  FOR ALL
  USING  (qr_id IN (SELECT id FROM public.qr_links WHERE user_id = auth.uid()))
  WITH CHECK (qr_id IN (SELECT id FROM public.qr_links WHERE user_id = auth.uid()));

-- Public read (runner needs the definition without auth)
CREATE POLICY qr_flows_public_read ON public.qr_flows
  FOR SELECT TO anon
  USING (true);


-- Form submissions (written by scanners, read by owner)
CREATE TABLE public.flow_submissions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_id        uuid NOT NULL REFERENCES public.qr_links(id) ON DELETE CASCADE,
  answers      jsonb NOT NULL DEFAULT '{}',
  submitted_at timestamptz NOT NULL DEFAULT now(),
  device_fp    text,
  lat          numeric,
  lng          numeric,
  user_agent   text
);
ALTER TABLE public.flow_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY flow_submissions_owner_read ON public.flow_submissions
  FOR SELECT
  USING (qr_id IN (SELECT id FROM public.qr_links WHERE user_id = auth.uid()));

CREATE POLICY flow_submissions_public_insert ON public.flow_submissions
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);


-- Webhooks per QR (fired on scan and/or submit)
CREATE TABLE public.qr_webhooks (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_id      uuid NOT NULL REFERENCES public.qr_links(id) ON DELETE CASCADE,
  url        text NOT NULL,
  trigger_on text[] NOT NULL DEFAULT '{scan,submit}',
  enabled    boolean NOT NULL DEFAULT true
);
ALTER TABLE public.qr_webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY qr_webhooks_owner ON public.qr_webhooks
  FOR ALL
  USING  (qr_id IN (SELECT id FROM public.qr_links WHERE user_id = auth.uid()))
  WITH CHECK (qr_id IN (SELECT id FROM public.qr_links WHERE user_id = auth.uid()));
