-- announcement-images bucket INSERT was 'any authenticated', but the only
-- thing that uploads to this bucket is the announcement editor (admin-only).
-- Tighten to admin-only so a logged-in non-admin can't poke files in there.

DROP POLICY IF EXISTS "Allow authenticated uploads to announcement-images" ON storage.objects;

CREATE POLICY "Admin can upload announcement-images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'announcement-images'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (select auth.uid()) AND p.role = 'admin'
    )
  );
