-- Phase 4: PIX, Calendar, Password Gate, Scan-Threshold routing

-- 1. Add new QR types
ALTER TABLE public.qr_links DROP CONSTRAINT IF EXISTS qr_links_type_check;
ALTER TABLE public.qr_links
  ADD CONSTRAINT qr_links_type_check
  CHECK (type IN ('link','file','vcard','whatsapp','wifi','video','links','flow','pdf','pix','calendar'));

-- 2. Password protection columns (any QR type)
ALTER TABLE public.qr_links
  ADD COLUMN IF NOT EXISTS password_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.qr_links
  ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- 3. Scan-threshold routing rule kind
ALTER TABLE public.qr_routing_rules DROP CONSTRAINT IF EXISTS qr_routing_rules_kind_check;
ALTER TABLE public.qr_routing_rules
  ADD CONSTRAINT qr_routing_rules_kind_check
  CHECK (kind IN ('schedule', 'geofence', 'identity', 'scan_threshold'));

-- 4. Expose password fields through resolve_qr RPC
--    (drop + recreate so it returns the new columns)
DROP FUNCTION IF EXISTS public.resolve_qr(text);
CREATE OR REPLACE FUNCTION public.resolve_qr(p_short_id text)
RETURNS TABLE (
  id                  uuid,
  title               text,
  type                text,
  short_id            text,
  destination_url     text,
  vcard_data          jsonb,
  active              boolean,
  clicks              integer,
  ga4_id              text,
  gtm_id              text,
  meta_pixel_id       text,
  tiktok_pixel_id     text,
  linkedin_partner_id text,
  twitter_pixel_id    text,
  pinterest_tag_id    text,
  add_utm             boolean,
  password_enabled    boolean,
  password_hash       text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    id, title, type, short_id, destination_url, vcard_data,
    active, clicks,
    ga4_id, gtm_id, meta_pixel_id, tiktok_pixel_id,
    linkedin_partner_id, twitter_pixel_id, pinterest_tag_id,
    add_utm, password_enabled, password_hash
  FROM public.qr_links
  WHERE short_id = p_short_id
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_qr(text) TO anon, authenticated;
