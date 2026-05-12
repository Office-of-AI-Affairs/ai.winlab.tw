-- 20260305000001_fix_security_performance_advisors.sql:277-287 dropped the
-- SECURITY DEFINER fix from 20250223000002 and re-created the recursive
-- policy that triggered 42P17 in the first place. Whoever wrote that
-- migration was wrapping auth.uid() in (select auth.uid()) for the advisor
-- 0003_auth_rls_initplan lint and didn't realise this policy was load-bearing
-- — they reverted the SECURITY DEFINER indirection along with the wrap.
--
-- Symptom in the wild: any authenticated query that touched team_members
-- (directly, or transitively via teams.policy / result_tags.policy whose
-- USING clauses reference team_members) failed with
-- `42P17: infinite recursion detected in policy for relation "team_members"`.
-- Reported by user 0038 / 蕭哲安 — viewing his own published result while
-- logged in 404'd; logged out, the page worked.
--
-- Restore the function-based form. get_user_team_ids stays from
-- 20250223000002, we just rebind the SELECT policy to it.

DROP POLICY IF EXISTS "Members can read team_members" ON public.team_members;

CREATE POLICY "Members can read team_members"
  ON public.team_members FOR SELECT TO authenticated
  USING (
    team_id IN (SELECT public.get_user_team_ids((select auth.uid())))
  );
