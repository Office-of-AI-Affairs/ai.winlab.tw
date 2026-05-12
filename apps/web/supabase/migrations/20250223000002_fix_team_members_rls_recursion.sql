-- Create a security definer function to get user's team IDs (bypasses RLS, breaks recursion)
CREATE OR REPLACE FUNCTION public.get_user_team_ids(p_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT team_id FROM team_members WHERE user_id = p_user_id;
$$;

-- Fix the recursive SELECT policy on team_members
-- The original policy: exists(select 1 from team_members tm where tm.team_id = ...) causes infinite recursion.
-- The function above runs as SECURITY DEFINER (postgres superuser), bypassing RLS, breaking the cycle.
DROP POLICY IF EXISTS "Members can read team_members" ON public.team_members;
CREATE POLICY "Members can read team_members"
  ON public.team_members FOR SELECT
  USING (
    team_id IN (SELECT public.get_user_team_ids(auth.uid()))
  );
