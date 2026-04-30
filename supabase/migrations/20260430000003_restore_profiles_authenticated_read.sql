-- The 20260430000001 lockdown was over-restrictive: it broke the public
-- profile UX (logged-in users seeing each other's bio / linkedin / github /
-- website / social_links — fields that are intentionally show-off, not
-- private). The actual PII surface was the resume PDF download, which stays
-- gated at the storage bucket + route level (20260430000002 + the route
-- handler). Restore profiles SELECT for authenticated.
--
-- Trade-off accepted: phone is also visible to all authenticated users.
-- Product owner has signed off on login-gating (vs full lockdown) for the
-- profile-fields layer. The resume PDF — the legally meaningful PII — stays
-- locked to self / admin / recruitment owner of an applicant.

DROP POLICY IF EXISTS "Self, admin, or recruitment owner can read profiles" ON public.profiles;

CREATE POLICY "Authenticated can read profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (true);
