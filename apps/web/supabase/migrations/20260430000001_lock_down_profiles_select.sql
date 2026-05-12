-- Tighten profiles SELECT.
--
-- Before: `Authenticated can read profiles USING true` (left over from
-- 20250211000001 with the "For simplicity" comment) — every logged-in user
-- could read everyone's phone, resume path, social links, bio, tags. The
-- 20260321 split intentionally moved public-facing fields to `public_profiles`
-- but only revoked the anon-side policy, leaving authenticated wide open.
--
-- After: profiles row is readable by
--   * the owner (auth.uid() = id)
--   * any admin
--   * a recruitment owner who has at least one applicant matching this profile
--     (vendor reviewing applications keeps working without leaking arbitrary
--     users)
-- Public team / event listings should already be going through the
-- `public_profiles` view (per docs/isr-pattern.md). One known caller still
-- on `profiles` for non-self avatars is app/profile/[id]/layout.tsx — switch
-- it to `public_profiles` (or accept fallback avatar) when this lands.

DROP POLICY IF EXISTS "Authenticated can read profiles" ON public.profiles;

CREATE POLICY "Self, admin, or recruitment owner can read profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    -- self
    (select auth.uid()) = id
    -- admin
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (select auth.uid()) AND p.role = 'admin'
    )
    -- recruitment owner viewing one of their applicants
    OR EXISTS (
      SELECT 1
      FROM public.recruitment_interests ri
      JOIN public.competition_owners co
        ON co.competition_id = ri.competition_id
      WHERE ri.user_id = profiles.id
        AND co.user_id = (select auth.uid())
    )
  );
