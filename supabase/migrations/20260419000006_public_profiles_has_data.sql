-- Expose "has any profile detail" as a boolean on public_profiles so the
-- cookieless cached fetcher for /events/[slug] can render the "尚無資料"
-- badge without needing to read the private profiles table (which is gated
-- to authenticated users only, making the server-side cached payload always
-- report hasProfileData = false regardless of the underlying reality).

ALTER TABLE public.public_profiles
  ADD COLUMN IF NOT EXISTS has_profile_data boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.compute_has_profile_data(p public.profiles)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(
    nullif(btrim(p.bio), '') IS NOT NULL
    OR nullif(btrim(p.phone), '') IS NOT NULL
    OR nullif(btrim(p.linkedin), '') IS NOT NULL
    OR nullif(btrim(p.facebook), '') IS NOT NULL
    OR nullif(btrim(p.github), '') IS NOT NULL
    OR nullif(btrim(p.website), '') IS NOT NULL
    OR nullif(btrim(p.resume), '') IS NOT NULL
    OR (p.social_links IS NOT NULL AND array_length(p.social_links, 1) > 0),
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.sync_public_profile_has_data()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.public_profiles (id, display_name, avatar_url, has_profile_data)
  VALUES (NEW.id, NEW.display_name, NEW.avatar_url, public.compute_has_profile_data(NEW))
  ON CONFLICT (id) DO UPDATE
    SET has_profile_data = EXCLUDED.has_profile_data,
        updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profiles_sync_has_data ON public.profiles;
CREATE TRIGGER on_profiles_sync_has_data
  AFTER INSERT OR UPDATE OF bio, phone, linkedin, facebook, github, website, resume, social_links ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_public_profile_has_data();

-- Backfill
UPDATE public.public_profiles pp
SET has_profile_data = public.compute_has_profile_data(p)
FROM public.profiles p
WHERE pp.id = p.id;
