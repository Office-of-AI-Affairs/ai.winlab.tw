-- Tighten resumes storage bucket SELECT.
--
-- Before: `resumes_select_authenticated USING (bucket_id = 'resumes')` —
-- any logged-in user could download anyone's resume PDF. Comment in
-- 20260419000001 claimed "vendors/admin see applicants" but the policy
-- never enforced that.
--
-- After: file under `resumes/<user-id>/...` is readable by
--   * the owner (folder name matches auth.uid())
--   * any admin
--   * a recruitment owner whose recruitment the file owner has applied to
-- Path convention is enforced by the existing `resumes_insert_own` policy
-- (`storage.foldername(name)[1] = auth.uid()::text`), so the foldername-based
-- ownership inference is sound.

DROP POLICY IF EXISTS "resumes_select_authenticated" ON storage.objects;

CREATE POLICY "resumes_select_owner_admin_or_recruitment_owner"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'resumes'
    AND (
      -- owner of the file (path: <auth_uid>/<filename>)
      (storage.foldername(name))[1] = (select auth.uid())::text
      -- admin
      OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = (select auth.uid()) AND p.role = 'admin'
      )
      -- recruitment owner whose recruitment the file owner has applied to
      OR EXISTS (
        SELECT 1
        FROM public.recruitment_interests ri
        JOIN public.competition_owners co
          ON co.competition_id = ri.competition_id
        WHERE ri.user_id::text = (storage.foldername(name))[1]
          AND co.user_id = (select auth.uid())
      )
    )
  );
