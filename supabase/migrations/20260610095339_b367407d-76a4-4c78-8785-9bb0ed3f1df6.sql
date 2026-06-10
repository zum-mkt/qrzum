
-- ============ app_role + user_roles + has_role ============
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_roles_self_select ON public.user_roles;
CREATE POLICY user_roles_self_select ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- ============ qr_links: new columns ============
ALTER TABLE public.qr_links
  ADD COLUMN IF NOT EXISTS proof_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS proof_anchor jsonb;

-- Allow new 'scanai' type (drop any existing check, recreate broader one if exists)
DO $$
DECLARE c text;
BEGIN
  SELECT conname INTO c FROM pg_constraint
   WHERE conrelid = 'public.qr_links'::regclass AND contype = 'c' AND conname LIKE '%type%';
  IF c IS NOT NULL THEN EXECUTE 'ALTER TABLE public.qr_links DROP CONSTRAINT ' || quote_ident(c); END IF;
END $$;

-- ============ qr_routing_rules ============
CREATE TABLE public.qr_routing_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_id uuid NOT NULL REFERENCES public.qr_links(id) ON DELETE CASCADE,
  priority integer NOT NULL DEFAULT 0,
  kind text NOT NULL CHECK (kind IN ('identity','schedule','geofence')),
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  action text NOT NULL DEFAULT 'redirect' CHECK (action IN ('redirect','block')),
  destination_url text,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX qr_routing_rules_qr_idx ON public.qr_routing_rules(qr_id, priority);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.qr_routing_rules TO authenticated;
GRANT ALL ON public.qr_routing_rules TO service_role;
ALTER TABLE public.qr_routing_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY qr_routing_owner_all ON public.qr_routing_rules FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.qr_links l WHERE l.id = qr_id AND l.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.qr_links l WHERE l.id = qr_id AND l.user_id = auth.uid()));

-- ============ qr_knowledge ============
CREATE TABLE public.qr_knowledge (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_id uuid NOT NULL REFERENCES public.qr_links(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  source_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX qr_knowledge_qr_idx ON public.qr_knowledge(qr_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.qr_knowledge TO authenticated;
GRANT ALL ON public.qr_knowledge TO service_role;
ALTER TABLE public.qr_knowledge ENABLE ROW LEVEL SECURITY;
CREATE POLICY qr_knowledge_owner_all ON public.qr_knowledge FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.qr_links l WHERE l.id = qr_id AND l.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.qr_links l WHERE l.id = qr_id AND l.user_id = auth.uid()));

-- ============ scanai_messages ============
CREATE TABLE public.scanai_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_id uuid NOT NULL REFERENCES public.qr_links(id) ON DELETE CASCADE,
  session_id text NOT NULL,
  role text NOT NULL CHECK (role IN ('user','assistant','system')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX scanai_messages_qr_session_idx ON public.scanai_messages(qr_id, session_id, created_at);
GRANT ALL ON public.scanai_messages TO service_role;
GRANT SELECT ON public.scanai_messages TO authenticated;
ALTER TABLE public.scanai_messages ENABLE ROW LEVEL SECURITY;
-- owner of QR can read
CREATE POLICY scanai_messages_owner_select ON public.scanai_messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.qr_links l WHERE l.id = qr_id AND l.user_id = auth.uid()));
-- inserts only via service_role (server route); no anon/authenticated insert policy

-- ============ presence_proofs ============
CREATE TABLE public.presence_proofs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_id uuid NOT NULL REFERENCES public.qr_links(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  scanned_at timestamptz NOT NULL DEFAULT now(),
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  accuracy_m double precision NOT NULL,
  device_fp text NOT NULL,
  nonce text NOT NULL UNIQUE,
  signature text NOT NULL,
  payload_hash text NOT NULL
);
CREATE INDEX presence_proofs_qr_idx ON public.presence_proofs(qr_id, scanned_at DESC);
GRANT SELECT ON public.presence_proofs TO authenticated;
GRANT ALL ON public.presence_proofs TO service_role;
ALTER TABLE public.presence_proofs ENABLE ROW LEVEL SECURITY;
CREATE POLICY presence_proofs_owner_select ON public.presence_proofs FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.qr_links l WHERE l.id = qr_id AND l.user_id = auth.uid()));
-- inserts only via service_role
