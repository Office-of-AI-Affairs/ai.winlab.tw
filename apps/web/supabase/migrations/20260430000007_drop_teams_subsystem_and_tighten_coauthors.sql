-- Teams subsystem nuke + result_coauthors SELECT tighten.
--
-- Why: production has 0 rows in teams / team_members / team_invitations,
-- and 0 results with type='team'. The subsystem was a dead branch that
-- the team-leader paths in results / result_tags policies kept dragging
-- around, and its team_members SELECT policy was the source of the
-- 42P17 recursion that broke 0038's profile (see 20260430000005).
-- Frontend cleanup ships in the same commit.
--
-- result_coauthors SELECT was 'published OR any-authenticated' which
-- leaked draft coauthor lists to every logged-in user. Today there are 0
-- coauthors on draft results so the leak is potential, not actual — but
-- the policy is wrong on its face.

-- 1) Tighten result_coauthors SELECT.
DROP POLICY IF EXISTS "Anyone can read coauthors of published results" ON public.result_coauthors;

CREATE POLICY "Self, author of result, coauthor of published, or admin can read result_coauthors"
  ON public.result_coauthors FOR SELECT
  USING (
    user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.results r
      WHERE r.id = result_coauthors.result_id
        AND (
          r.status = 'published'
          OR r.author_id = (select auth.uid())
          OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (select auth.uid()) AND p.role = 'admin')
        )
    )
  );

-- 2) Recreate results policies dropping the team-leader branch
-- (depends on is_team_leader which we're about to drop).
DROP POLICY IF EXISTS "Author or admin can insert result" ON public.results;
DROP POLICY IF EXISTS "Author or team leader or admin can delete result" ON public.results;
DROP POLICY IF EXISTS "Authenticated read own, led-team, published, or admin results" ON public.results;
DROP POLICY IF EXISTS "Author or team leader or admin can update result" ON public.results;

CREATE POLICY "Author or admin can insert result"
  ON public.results FOR INSERT TO authenticated
  WITH CHECK (
    author_id = (select auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (select auth.uid()) AND p.role = 'admin')
  );

CREATE POLICY "Author or admin can delete result"
  ON public.results FOR DELETE TO authenticated
  USING (
    author_id = (select auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (select auth.uid()) AND p.role = 'admin')
  );

CREATE POLICY "Authenticated read own, published, or admin results"
  ON public.results FOR SELECT TO authenticated
  USING (
    status = 'published'
    OR author_id = (select auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (select auth.uid()) AND p.role = 'admin')
  );

CREATE POLICY "Author or admin can update result"
  ON public.results FOR UPDATE TO authenticated
  USING (
    author_id = (select auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (select auth.uid()) AND p.role = 'admin')
  );

-- 3) Recreate result_tags policies dropping the team-leader branch.
DROP POLICY IF EXISTS "Author or leader or admin can insert result_tags" ON public.result_tags;
DROP POLICY IF EXISTS "Author or leader or admin can delete result_tags" ON public.result_tags;

CREATE POLICY "Author or admin can insert result_tags"
  ON public.result_tags FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.results r
      WHERE r.id = result_tags.result_id
        AND (
          r.author_id = (select auth.uid())
          OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (select auth.uid()) AND p.role = 'admin')
        )
    )
  );

CREATE POLICY "Author or admin can delete result_tags"
  ON public.result_tags FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.results r
      WHERE r.id = result_tags.result_id
        AND (
          r.author_id = (select auth.uid())
          OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (select auth.uid()) AND p.role = 'admin')
        )
    )
  );

-- 4) Drop team_id + type columns from results.
ALTER TABLE public.results DROP CONSTRAINT IF EXISTS results_team_id_fkey;
ALTER TABLE public.results DROP CONSTRAINT IF EXISTS results_type_check;
ALTER TABLE public.results DROP COLUMN IF EXISTS team_id;
ALTER TABLE public.results DROP COLUMN IF EXISTS type;

-- 5) Drop tables (CASCADE for any leftover dependents).
DROP TABLE IF EXISTS public.team_invitations CASCADE;
DROP TABLE IF EXISTS public.public_teams CASCADE;
DROP TABLE IF EXISTS public.team_members CASCADE;
DROP TABLE IF EXISTS public.teams CASCADE;

-- 6) Drop helper functions.
DROP FUNCTION IF EXISTS public.is_team_leader(uuid, uuid);
DROP FUNCTION IF EXISTS public.get_user_team_ids(uuid);
DROP FUNCTION IF EXISTS public.sync_public_team_from_team();
