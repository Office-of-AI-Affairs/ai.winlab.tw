-- Create private resumes bucket (PDF only, 10 MB limit)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('resumes', 'resumes', false, 10485760, ARRAY['application/pdf'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- RLS: authenticated user uploads own file (path must start with their uid/)
CREATE POLICY "resumes_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'resumes'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- RLS: authenticated user updates own
CREATE POLICY "resumes_update_own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'resumes'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
  )
  WITH CHECK (
    bucket_id = 'resumes'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- RLS: authenticated user deletes own
CREATE POLICY "resumes_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'resumes'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- RLS: any authenticated user can SELECT (maintains current access — vendors/admin see applicants)
CREATE POLICY "resumes_select_authenticated" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'resumes');
