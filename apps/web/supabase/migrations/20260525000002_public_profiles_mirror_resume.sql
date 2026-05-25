-- Mirror profiles.resume into public_profiles so authenticated viewers can see
-- another member's resume link from the /profile/[id] page. Profiles SELECT RLS
-- (tightened in 20260518000001) blocks viewer A from reading viewer B's
-- profiles row, so the route handler can no longer resolve the resume path.
-- After this migration:
--   - public_profiles.resume holds the storage path mirror.
--   - sync_public_profile_from_profile() also carries the resume column.
--   - The path is opaque (uuid/timestamp-random.pdf); PDF content is still
--     gated by resumes_select_authenticated (storage RLS, auth required) +
--     the route handler's login redirect. So exposing the path through
--     public_profiles (SELECT = true) only changes who can see the link,
--     not who can download the bytes.

ALTER TABLE public.public_profiles
  ADD COLUMN IF NOT EXISTS resume text;

CREATE OR REPLACE FUNCTION public.sync_public_profile_from_profile()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.public_profiles (
    id, created_at, updated_at,
    display_name, avatar_url,
    bio, linkedin, facebook, github, website,
    social_links, role, resume
  )
  VALUES (
    NEW.id, NEW.created_at, NEW.updated_at,
    NEW.display_name, NEW.avatar_url,
    NEW.bio, NEW.linkedin, NEW.facebook, NEW.github, NEW.website,
    COALESCE(NEW.social_links, '{}'::text[]), NEW.role, NEW.resume
  )
  ON CONFLICT (id) DO UPDATE
  SET
    updated_at   = NEW.updated_at,
    display_name = NEW.display_name,
    avatar_url   = NEW.avatar_url,
    bio          = NEW.bio,
    linkedin     = NEW.linkedin,
    facebook     = NEW.facebook,
    github       = NEW.github,
    website      = NEW.website,
    social_links = COALESCE(NEW.social_links, '{}'::text[]),
    role         = NEW.role,
    resume       = NEW.resume;
  RETURN NEW;
END;
$$;

UPDATE public.public_profiles pp
SET resume = p.resume
FROM public.profiles p
WHERE pp.id = p.id;
