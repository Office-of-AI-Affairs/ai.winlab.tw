-- Consolidate overlapping permissive policies flagged by advisor lint
-- 0006_multiple_permissive_policies. Merging them avoids Postgres evaluating
-- both on every row for the same role/action.

-- profiles UPDATE: admin-any OR own (with role-stays-same check)
DROP POLICY IF EXISTS "Admin can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Admin or owner can update profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    (select auth.uid()) = id
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = (select auth.uid()) AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = (select auth.uid()) AND p.role = 'admin'
    )
    OR (
      (select auth.uid()) = id
      AND role = (SELECT p.role FROM profiles p WHERE p.id = (select auth.uid()))
    )
  );

-- team_members DELETE: team leader OR the member themselves
DROP POLICY IF EXISTS "Leader can delete team_members" ON public.team_members;
DROP POLICY IF EXISTS "User can leave team" ON public.team_members;

CREATE POLICY "Leader or self can delete team_members" ON public.team_members
  FOR DELETE TO authenticated
  USING (
    user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM teams t
      WHERE t.id = team_members.team_id
        AND t.leader_id = (select auth.uid())
    )
  );
