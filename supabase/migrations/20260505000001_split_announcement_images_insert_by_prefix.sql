-- announcement-images bucket is shared by 7 upload helpers (lib/upload-image.ts).
-- 20260430000006 mistakenly tightened INSERT to admin-only assuming only the
-- announcement editor wrote here — wrong: results/ and recruitment/ prefixes
-- are also written by non-admin authors / recruitment owners.
--
-- Symptom: editing your own result hits "new row violates row-level security"
-- when uploading a header image.
--
-- Fix: split INSERT by path prefix. UPDATE/DELETE stay admin-only (handled in
-- earlier migrations) so non-admin can only land NEW files at random paths,
-- never overwrite or delete.

DROP POLICY IF EXISTS "Admin can upload announcement-images" ON storage.objects;

CREATE POLICY "Insert announcement-images by prefix"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'announcement-images'
    AND (
      -- admin: any prefix
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = (select auth.uid()) AND p.role = 'admin'
      )
      OR
      -- results/<file>: any authenticated user.
      -- The image URL must exist before the results row is INSERTed
      -- (header_image stores the URL), so storage can't join public.results
      -- to verify ownership at upload time. The row-level INSERT/UPDATE RLS
      -- on public.results (author_id = auth.uid() OR admin) is the real
      -- ownership boundary; storage just provides the URL.
      name LIKE 'results/%'
      OR
      -- recruitment/<file>: must own at least one recruitment.
      -- vendor accounts only get a competition_owners row when admin assigns
      -- them, so this naturally gates non-admin uploads.
      (
        name LIKE 'recruitment/%'
        AND EXISTS (
          SELECT 1 FROM public.competition_owners co
          WHERE co.user_id = (select auth.uid())
        )
      )
    )
  );
