-- Public storage bucket for "Links" page customization assets (header image, avatar).
-- Separate from `qr_files` on purpose: qr_files' read policy was tightened to
-- authenticated-owner-only (see 20260606101748_...sql), but header/avatar images
-- must stay publicly readable since they're shown on the anonymous /links/:id page.

INSERT INTO storage.buckets (id, name, public) VALUES ('links_assets', 'links_assets', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "links_assets_public_read" ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'links_assets');

CREATE POLICY "links_assets_user_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'links_assets' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "links_assets_user_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'links_assets' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "links_assets_user_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'links_assets' AND (storage.foldername(name))[1] = auth.uid()::text);
