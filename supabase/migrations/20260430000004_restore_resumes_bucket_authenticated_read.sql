-- Product owner has chosen to keep the original UX: any logged-in user can
-- download any other user's resume PDF. Revert the bucket lockdown to match.
-- See 20260430000003 for the parallel revert on profiles SELECT.

DROP POLICY IF EXISTS "resumes_select_owner_admin_or_recruitment_owner" ON storage.objects;

CREATE POLICY "resumes_select_authenticated"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'resumes');
