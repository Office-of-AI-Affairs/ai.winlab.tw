-- The results UPDATE/DELETE/INSERT policies query team_members via EXISTS,
-- which triggers team_members RLS, causing infinite recursion.
-- Fix: use a SECURITY DEFINER function that bypasses RLS to check team leadership.

CREATE OR REPLACE FUNCTION public.is_team_leader(p_team_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_id = p_team_id AND user_id = p_user_id AND role = 'leader'
  );
$$;

-- Recreate results INSERT policy
DROP POLICY IF EXISTS "Author can insert result" ON public.results;
CREATE POLICY "Author can insert result"
  ON public.results FOR INSERT TO authenticated
  WITH CHECK (
    author_id = (SELECT auth.uid())
    OR (
      type = 'team' AND team_id IS NOT NULL
      AND public.is_team_leader(team_id, (SELECT auth.uid()))
    )
  );

-- Recreate results UPDATE policy
DROP POLICY IF EXISTS "Author or team leader or admin can update result" ON public.results;
CREATE POLICY "Author or team leader or admin can update result"
  ON public.results FOR UPDATE TO authenticated
  USING (
    author_id = (SELECT auth.uid())
    OR (type = 'team' AND team_id IS NOT NULL AND public.is_team_leader(team_id, (SELECT auth.uid())))
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
    )
  );

-- Recreate results DELETE policy
DROP POLICY IF EXISTS "Author or team leader or admin can delete result" ON public.results;
CREATE POLICY "Author or team leader or admin can delete result"
  ON public.results FOR DELETE TO authenticated
  USING (
    author_id = (SELECT auth.uid())
    OR (type = 'team' AND team_id IS NOT NULL AND public.is_team_leader(team_id, (SELECT auth.uid())))
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
    )
  );
