-- Fix infinite recursion in profiles UPDATE policy.
-- Companion to 20260518000002_p0_security_fix_recursion.sql, which only fixed
-- the SELECT policy. The UPDATE policy "Admin or owner can update profile"
-- still embeds inline `SELECT FROM public.profiles` subqueries (one EXISTS for
-- the admin check, one scalar SELECT for the role-preserve check). After
-- 20260518000001 tightened the SELECT policy on profiles, those inline
-- subqueries re-enter RLS on the same relation and Postgres bails with
-- "42P17 infinite recursion detected in policy for relation profiles".
--
-- Repro: as authenticated user, `UPDATE profiles SET resume=... WHERE id=self`
-- (resume upload on /profile/[id]) — fails on every row. Same blast radius
-- covers every column saved via use-profile-editor: display_name, bio,
-- social_links, linkedin, facebook, github, website, resume. So the entire
-- profile-edit surface has been broken since the P0 security migration shipped.
--
-- Fix:
--   - Replace the inline admin EXISTS with public.current_user_is_admin()
--     (already SECURITY DEFINER, introduced in 20260518000002).
--   - Add public.current_user_role() SECURITY DEFINER helper for the
--     role-preserve WITH CHECK so it doesn't re-enter profiles RLS either.

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.current_user_role() FROM public;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;

DROP POLICY IF EXISTS "Admin or owner can update profile" ON public.profiles;

CREATE POLICY "Admin or owner can update profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (
    (select auth.uid()) = id
    OR public.current_user_is_admin()
  )
  WITH CHECK (
    public.current_user_is_admin()
    OR (
      (select auth.uid()) = id
      AND role = public.current_user_role()
    )
  );
