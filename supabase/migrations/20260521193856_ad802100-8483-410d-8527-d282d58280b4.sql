
-- qr_links table
CREATE TABLE public.qr_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  type text NOT NULL CHECK (type IN ('link','file','vcard')),
  short_id text NOT NULL UNIQUE,
  destination_url text NOT NULL,
  vcard_data jsonb,
  color text NOT NULL DEFAULT '#000000',
  clicks integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_qr_links_user ON public.qr_links(user_id);
CREATE INDEX idx_qr_links_short ON public.qr_links(short_id);

ALTER TABLE public.qr_links ENABLE ROW LEVEL SECURITY;

-- Owner can do everything on own rows
CREATE POLICY "owner_select" ON public.qr_links FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "owner_insert" ON public.qr_links FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner_update" ON public.qr_links FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner_delete" ON public.qr_links FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Public RPC: resolve short_id, increment clicks, return destination data
CREATE OR REPLACE FUNCTION public.resolve_qr(p_short_id text)
RETURNS TABLE(type text, destination_url text, vcard_data jsonb, title text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.qr_links
     SET clicks = clicks + 1
   WHERE short_id = p_short_id;

  RETURN QUERY
  SELECT q.type, q.destination_url, q.vcard_data, q.title
    FROM public.qr_links q
   WHERE q.short_id = p_short_id
   LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_qr(text) TO anon, authenticated;

-- Storage bucket for uploads (public)
INSERT INTO storage.buckets (id, name, public) VALUES ('qr_files', 'qr_files', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: anyone can read; authenticated can upload to their own folder
CREATE POLICY "qr_files_public_read" ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'qr_files');

CREATE POLICY "qr_files_user_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'qr_files' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "qr_files_user_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'qr_files' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "qr_files_user_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'qr_files' AND (storage.foldername(name))[1] = auth.uid()::text);
