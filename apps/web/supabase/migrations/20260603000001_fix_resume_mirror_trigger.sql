-- Fix: resume (and every other mirrored column) silently stopped syncing to
-- public_profiles on ordinary profile edits.
--
-- 20260525000002 added `resume` to sync_public_profile_from_profile() and ran a
-- one-time backfill, but left the trigger listening on UPDATE OF (display_name,
-- updated_at) only. Uploading a resume is `UPDATE profiles SET resume = ...`,
-- which never targets display_name, so the trigger never fired -- anyone who
-- uploaded a resume *after* that backfill kept a NULL public_profiles.resume.
-- The /profile/[id]/resume route reads the mirror, finds NULL, and redirects
-- back to the profile page, so "查看履歷" looks dead. The same whitelist gap
-- staled bio / avatar_url / links / role on any non-display_name edit too.
--
-- Rather than re-curate the column whitelist (which already drifted once), fire
-- the idempotent whole-row mirror on ANY insert/update. profiles writes are
-- infrequent, so the extra upserts are cheap insurance against the next column
-- being forgotten.

DROP TRIGGER IF EXISTS sync_public_profile_from_profile ON public.profiles;
CREATE TRIGGER sync_public_profile_from_profile
  AFTER INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_public_profile_from_profile();

-- Repair rows that drifted before the trigger fix (resume is the known break,
-- but re-mirror every column since the same gap could have staled any of them).
UPDATE public.public_profiles pp
SET
  display_name = p.display_name,
  avatar_url   = p.avatar_url,
  bio          = p.bio,
  linkedin     = p.linkedin,
  facebook     = p.facebook,
  github       = p.github,
  website      = p.website,
  social_links = COALESCE(p.social_links, '{}'::text[]),
  role         = p.role,
  resume       = p.resume,
  updated_at   = p.updated_at
FROM public.profiles p
WHERE pp.id = p.id
  AND (
       pp.display_name IS DISTINCT FROM p.display_name
    OR pp.avatar_url   IS DISTINCT FROM p.avatar_url
    OR pp.bio          IS DISTINCT FROM p.bio
    OR pp.linkedin     IS DISTINCT FROM p.linkedin
    OR pp.facebook     IS DISTINCT FROM p.facebook
    OR pp.github       IS DISTINCT FROM p.github
    OR pp.website      IS DISTINCT FROM p.website
    OR pp.social_links IS DISTINCT FROM COALESCE(p.social_links, '{}'::text[])
    OR pp.role         IS DISTINCT FROM p.role
    OR pp.resume       IS DISTINCT FROM p.resume
  );
