
ALTER TABLE public.qr_links
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

DROP FUNCTION IF EXISTS public.resolve_qr(text);

CREATE FUNCTION public.resolve_qr(p_short_id text)
RETURNS TABLE(type text, destination_url text, vcard_data jsonb, title text, active boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.qr_links
     SET clicks = clicks + 1
   WHERE short_id = p_short_id
     AND active = true;

  RETURN QUERY
  SELECT q.type, q.destination_url, q.vcard_data, q.title, q.active
    FROM public.qr_links q
   WHERE q.short_id = p_short_id
   LIMIT 1;
END;
$function$;
