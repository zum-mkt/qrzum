
DROP FUNCTION IF EXISTS public.resolve_qr(text);

CREATE OR REPLACE FUNCTION public.resolve_qr(p_short_id text)
RETURNS TABLE(
  id uuid,
  type text,
  destination_url text,
  vcard_data jsonb,
  title text,
  active boolean,
  ga4_id text,
  gtm_id text,
  meta_pixel_id text,
  tiktok_pixel_id text,
  linkedin_partner_id text,
  twitter_pixel_id text,
  pinterest_tag_id text,
  add_utm boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.qr_links q
     SET clicks = q.clicks + 1
   WHERE q.short_id = p_short_id
     AND q.active = true;

  RETURN QUERY
  SELECT q.id, q.type, q.destination_url, q.vcard_data, q.title, q.active,
         q.ga4_id, q.gtm_id, q.meta_pixel_id, q.tiktok_pixel_id,
         q.linkedin_partner_id, q.twitter_pixel_id, q.pinterest_tag_id, q.add_utm
    FROM public.qr_links q
   WHERE q.short_id = p_short_id
   LIMIT 1;
END;
$function$;
