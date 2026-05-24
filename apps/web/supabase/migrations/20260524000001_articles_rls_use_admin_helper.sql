-- Refactor articles RLS policies to use the public.current_user_is_admin()
-- SECURITY DEFINER helper introduced in 20260518000002. The four original
-- policies (created in 20260515000002_create_articles.sql) each inline a
-- `SELECT FROM public.profiles WHERE role='admin'` EXISTS subquery. That
-- duplicates the admin-check definition four times, so any future change to
-- how admin is determined (e.g. role hierarchy, claim source) risks drifting
-- one of them.
--
-- Pure refactor — no schema change, no data change, no behavior change. The
-- member-role EXISTS subquery is intentionally left as-is: there is no
-- current_user_is_member() helper, and this PR's scope is admin only.
--
-- Old migration files are immutable history; we DROP + CREATE here instead
-- of mutating 20260515000002.

DROP POLICY IF EXISTS "Read published or own draft or admin" ON public.articles;
DROP POLICY IF EXISTS "Admin or member can insert article" ON public.articles;
DROP POLICY IF EXISTS "Admin or author member can update article" ON public.articles;
DROP POLICY IF EXISTS "Admin or author member can delete article" ON public.articles;

-- SELECT: published is public; drafts visible to author + admin only.
CREATE POLICY "Read published or own draft or admin"
  ON public.articles FOR SELECT TO anon, authenticated
  USING (
    status = 'published'
    OR author_id = (select auth.uid())
    OR public.current_user_is_admin()
  );

-- INSERT: admin (free choice of author_id) or member (must be themselves).
CREATE POLICY "Admin or member can insert article"
  ON public.articles FOR INSERT TO authenticated
  WITH CHECK (
    public.current_user_is_admin()
    OR (
      author_id = (select auth.uid())
      AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = (select auth.uid()) AND role = 'member'
      )
    )
  );

-- UPDATE: admin anything; member only their own.
CREATE POLICY "Admin or author member can update article"
  ON public.articles FOR UPDATE TO authenticated
  USING (
    public.current_user_is_admin()
    OR (
      author_id = (select auth.uid())
      AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = (select auth.uid()) AND role = 'member'
      )
    )
  )
  WITH CHECK (
    public.current_user_is_admin()
    OR (
      author_id = (select auth.uid())
      AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = (select auth.uid()) AND role = 'member'
      )
    )
  );

-- DELETE: admin anything; member only their own.
CREATE POLICY "Admin or author member can delete article"
  ON public.articles FOR DELETE TO authenticated
  USING (
    public.current_user_is_admin()
    OR (
      author_id = (select auth.uid())
      AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = (select auth.uid()) AND role = 'member'
      )
    )
  );
