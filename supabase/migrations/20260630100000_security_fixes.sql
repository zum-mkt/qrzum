-- =============================================================
-- Security hardening: RLS pricing + resolve_qr without hash
-- =============================================================

-- 1. Fix RLS on pricing tables: restrict writes to service_role only
--    (previously ANY authenticated user could modify plans/prices)

DROP POLICY IF EXISTS "authenticated can manage features"  ON public.pricing_features;
DROP POLICY IF EXISTS "authenticated can manage plans"     ON public.pricing_plans;
DROP POLICY IF EXISTS "authenticated can manage plan features" ON public.pricing_plan_features;

CREATE POLICY "service role manages features"
  ON public.pricing_features FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "service role manages plans"
  ON public.pricing_plans FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "service role manages plan features"
  ON public.pricing_plan_features FOR ALL
  USING (auth.role() = 'service_role');

-- 2. Recreate resolve_qr without password_hash
--    Server-side verify-password endpoint handles comparison now
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
  password_enabled    boolean
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
    add_utm, password_enabled
  FROM public.qr_links
  WHERE short_id = p_short_id
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_qr(text) TO anon, authenticated;
