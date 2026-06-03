CREATE OR REPLACE FUNCTION public.resolve_qr(p_short_id text)
 RETURNS TABLE(type text, destination_url text, vcard_data jsonb, title text, active boolean)
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
  SELECT q.type, q.destination_url, q.vcard_data, q.title, q.active
    FROM public.qr_links q
   WHERE q.short_id = p_short_id
   LIMIT 1;
END;
$function$;