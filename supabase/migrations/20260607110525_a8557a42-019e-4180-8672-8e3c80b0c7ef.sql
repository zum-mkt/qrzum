-- Folders
CREATE TABLE public.folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#64748b',
  parent_id uuid REFERENCES public.folders(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.folders TO authenticated;
GRANT ALL ON public.folders TO service_role;
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
CREATE POLICY folders_owner_all ON public.folders FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX folders_user_idx ON public.folders(user_id);

-- Tags
CREATE TABLE public.tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#64748b',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tags TO authenticated;
GRANT ALL ON public.tags TO service_role;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY tags_owner_all ON public.tags FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- qr_links new columns
ALTER TABLE public.qr_links
  ADD COLUMN IF NOT EXISTS folder_id uuid REFERENCES public.folders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS style jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS frame_text text;
CREATE INDEX IF NOT EXISTS qr_links_folder_idx ON public.qr_links(folder_id);

-- Allow 'pdf' type
ALTER TABLE public.qr_links DROP CONSTRAINT IF EXISTS qr_links_type_check;
ALTER TABLE public.qr_links ADD CONSTRAINT qr_links_type_check
  CHECK (type IN ('link','file','vcard','whatsapp','wifi','video','links','pdf'));

-- Tag join
CREATE TABLE public.qr_link_tags (
  qr_id uuid NOT NULL REFERENCES public.qr_links(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (qr_id, tag_id)
);
GRANT SELECT, INSERT, DELETE ON public.qr_link_tags TO authenticated;
GRANT ALL ON public.qr_link_tags TO service_role;
ALTER TABLE public.qr_link_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY qr_link_tags_owner_all ON public.qr_link_tags FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.qr_links WHERE qr_links.id = qr_link_tags.qr_id AND qr_links.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.qr_links WHERE qr_links.id = qr_link_tags.qr_id AND qr_links.user_id = auth.uid()));

-- qr_scans: visitor hash for unique visitors
ALTER TABLE public.qr_scans ADD COLUMN IF NOT EXISTS visitor_hash text;
CREATE INDEX IF NOT EXISTS qr_scans_visitor_idx ON public.qr_scans(qr_id, visitor_hash);

-- RPC: unique visitors per QR within range
CREATE OR REPLACE FUNCTION public.qr_unique_visitors(p_days int)
RETURNS TABLE(qr_id uuid, uniques bigint)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT s.qr_id, COUNT(DISTINCT s.visitor_hash) AS uniques
  FROM public.qr_scans s
  JOIN public.qr_links l ON l.id = s.qr_id
  WHERE l.user_id = auth.uid()
    AND s.scanned_at >= now() - (p_days || ' days')::interval
    AND s.visitor_hash IS NOT NULL
  GROUP BY s.qr_id;
$$;
GRANT EXECUTE ON FUNCTION public.qr_unique_visitors(int) TO authenticated;