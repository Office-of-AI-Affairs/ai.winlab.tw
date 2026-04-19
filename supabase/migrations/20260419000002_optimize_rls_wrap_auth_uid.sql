-- Wrap auth.uid() calls in (select auth.uid()) so Postgres caches per-statement,
-- not per-row. Fixes advisor lint 0003_auth_rls_initplan.

ALTER POLICY "event_participants_delete" ON public.event_participants
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'));

ALTER POLICY "event_participants_insert" ON public.event_participants
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'));

ALTER POLICY "owner delete external_results" ON public.external_results
  USING ((select auth.uid()) = user_id);

ALTER POLICY "owner insert external_results" ON public.external_results
  WITH CHECK ((select auth.uid()) = user_id);

ALTER POLICY "owner update external_results" ON public.external_results
  USING ((select auth.uid()) = user_id);

ALTER POLICY "Anyone can read coauthors of published results" ON public.result_coauthors
  USING (EXISTS (
    SELECT 1 FROM results r
    WHERE r.id = result_coauthors.result_id
      AND (r.status = 'published' OR (select auth.uid()) IS NOT NULL)
  ));

ALTER POLICY "Result author or admin can delete coauthors" ON public.result_coauthors
  USING (
    EXISTS (SELECT 1 FROM results r WHERE r.id = result_coauthors.result_id AND r.author_id = (select auth.uid()))
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = (select auth.uid()) AND p.role = 'admin')
  );

ALTER POLICY "Result author or admin can insert coauthors" ON public.result_coauthors
  WITH CHECK (
    EXISTS (SELECT 1 FROM results r WHERE r.id = result_coauthors.result_id AND r.author_id = (select auth.uid()))
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = (select auth.uid()) AND p.role = 'admin')
  );
