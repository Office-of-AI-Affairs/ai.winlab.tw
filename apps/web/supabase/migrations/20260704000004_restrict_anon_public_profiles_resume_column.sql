-- Finding 3: public_profiles is anon-readable (RLS using(true)) and mirrors the
-- `resume` storage path, letting anonymous visitors enumerate every member's
-- resume path + name. anon held a TABLE-level SELECT (covers all columns), so a
-- column-level REVOKE(resume) alone is a no-op — must drop the table grant and
-- re-grant column-by-column, omitting `resume`. authenticated keeps its full
-- table SELECT (the /profile resume link + resume/route.ts read it as an
-- authenticated role — PO-approved "any signed-in user may view resumes").
-- The app stopped selecting resume on the anon path in the same release.
-- Applied to production 2026-07-04 via Supabase MCP; backfills IaC.
revoke select on public.public_profiles from anon;
grant select (
  id, created_at, updated_at, display_name, avatar_url, has_profile_data,
  bio, linkedin, facebook, github, website, social_links, role
) on public.public_profiles to anon;
