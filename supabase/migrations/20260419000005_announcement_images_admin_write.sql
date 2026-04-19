-- Allow admins to update/delete objects in the announcement-images bucket.
-- Previously only authenticated INSERT + public SELECT were wired, so admins
-- could never clean up or replace existing assets — new uploads just piled up
-- as orphans (see the 56-orphan resume migration for reference). This unblocks
-- the recompression script and future admin clean-up flows.

CREATE POLICY "Admin can update announcement-images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'announcement-images'
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = (select auth.uid()) AND role = 'admin')
  );

CREATE POLICY "Admin can delete announcement-images" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'announcement-images'
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = (select auth.uid()) AND role = 'admin')
  );
