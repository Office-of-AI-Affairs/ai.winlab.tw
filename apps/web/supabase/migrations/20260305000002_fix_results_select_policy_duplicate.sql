-- "Public read published results" currently applies to anon + authenticated.
-- "Authenticated read all results" already covers authenticated with USING (true).
-- Restricting "Public read published results" to anon only removes the duplicate.
DROP POLICY IF EXISTS "Public read published results" ON public.results;

CREATE POLICY "Public read published results"
  ON public.results FOR SELECT TO anon
  USING (status = 'published');
