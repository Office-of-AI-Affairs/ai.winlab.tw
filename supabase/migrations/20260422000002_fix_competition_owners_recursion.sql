-- The original SELECT policy referenced `competition_owners` inside its own
-- USING clause to let co-owners see each other; Postgres evaluates the
-- subquery with RLS still active and flags it as infinite recursion
-- (42P17). Drop the co-owner branch — admins see the full list (which is
-- what powers RecruitmentOwnerPicker), and each owner sees their own rows
-- (which is what powers the client-side `ownedRecruitmentIds` set). Peer
-- visibility between owners isn't a product requirement.

DROP POLICY IF EXISTS "Owner, co-owner, or admin can read competition_owners"
  ON public.competition_owners;

CREATE POLICY "Owner or admin can read competition_owners"
  ON public.competition_owners FOR SELECT TO authenticated
  USING (
    user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (select auth.uid()) AND p.role = 'admin'
    )
  );
