-- 1) Pixel columns + UTM flag on qr_links
ALTER TABLE public.qr_links
  ADD COLUMN IF NOT EXISTS ga4_id text,
  ADD COLUMN IF NOT EXISTS gtm_id text,
  ADD COLUMN IF NOT EXISTS meta_pixel_id text,
  ADD COLUMN IF NOT EXISTS tiktok_pixel_id text,
  ADD COLUMN IF NOT EXISTS linkedin_partner_id text,
  ADD COLUMN IF NOT EXISTS twitter_pixel_id text,
  ADD COLUMN IF NOT EXISTS pinterest_tag_id text,
  ADD COLUMN IF NOT EXISTS add_utm boolean NOT NULL DEFAULT false;

-- 2) Allow all 7 QR types
ALTER TABLE public.qr_links DROP CONSTRAINT IF EXISTS qr_links_type_check;
ALTER TABLE public.qr_links
  ADD CONSTRAINT qr_links_type_check
  CHECK (type IN ('link','file','vcard','whatsapp','wifi','video','links'));

-- 3) qr_scans table
CREATE TABLE IF NOT EXISTS public.qr_scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_id uuid NOT NULL REFERENCES public.qr_links(id) ON DELETE CASCADE,
  scanned_at timestamptz NOT NULL DEFAULT now(),
  country text,
  city text,
  device text,
  os text,
  browser text,
  referrer text
);

CREATE INDEX IF NOT EXISTS qr_scans_qr_id_scanned_at_idx
  ON public.qr_scans (qr_id, scanned_at DESC);

GRANT SELECT ON public.qr_scans TO authenticated;
GRANT ALL ON public.qr_scans TO service_role;

ALTER TABLE public.qr_scans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS owner_select_scans ON public.qr_scans;
CREATE POLICY owner_select_scans ON public.qr_scans
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.qr_links
     WHERE qr_links.id = qr_scans.qr_id
       AND qr_links.user_id = auth.uid()
  ));