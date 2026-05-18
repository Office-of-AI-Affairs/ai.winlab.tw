-- Fix infinite recursion in the profiles SELECT policy from
-- 20260518000001_p0_security_hardening.sql. The previous policy's EXISTS
-- subqueries re-read public.profiles, which re-fires the same SELECT policy
-- on each row → Postgres bails with "infinite recursion detected".
--
-- Pull the role lookup and the recruitment_owner check into SECURITY DEFINER
-- helpers that bypass RLS for that one targeted query.

CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.current_user_is_admin() FROM public;
GRANT EXECUTE ON FUNCTION public.current_user_is_admin() TO authenticated;

-- Is auth.uid() the recruitment_owner of any recruitment that target_user_id
-- has expressed interest in? Used so vendors can still see applicant rows on
-- their own recruitment, without giving them a window into everyone else.
CREATE OR REPLACE FUNCTION public.current_user_owns_recruitment_with_applicant(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.recruitment_interests ri
    JOIN public.competition_owners co
      ON co.competition_id = ri.competition_id
    WHERE ri.user_id = target_user_id
      AND co.user_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.current_user_owns_recruitment_with_applicant(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.current_user_owns_recruitment_with_applicant(uuid) TO authenticated;

DROP POLICY IF EXISTS "Self, admin, or recruitment_owner can read profiles" ON public.profiles;

CREATE POLICY "Self, admin, or recruitment_owner can read profiles"
ON public.profiles FOR SELECT TO authenticated
USING (
  id = (SELECT auth.uid())
  OR public.current_user_is_admin()
  OR public.current_user_owns_recruitment_with_applicant(id)
);
