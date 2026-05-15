-- Add 'member' to profiles.role — office insiders who can publish Insights
-- articles. Mirrors the vendor_role migration (20260324000001) pattern.

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check,
  ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'user', 'vendor', 'member'));
