ALTER TABLE public.qr_links
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS bg_color text NOT NULL DEFAULT '#ffffff',
  ADD COLUMN IF NOT EXISTS frame_style text NOT NULL DEFAULT 'none';