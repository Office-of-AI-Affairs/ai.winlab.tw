-- Fix: allow all authenticated users to read competition_private_details
-- The vendor_security_fixes migration was too restrictive — it required users
-- to be admin, vendor, or already interested before they could view details.
-- This created a chicken-and-egg problem where users couldn't see details
-- to decide whether to express interest.

DROP POLICY IF EXISTS "Admin, vendor, or interested user can read competition_private_details" ON public.competition_private_details;

CREATE POLICY "Authenticated can read competition_private_details"
  ON public.competition_private_details FOR SELECT TO authenticated
  USING (true);
