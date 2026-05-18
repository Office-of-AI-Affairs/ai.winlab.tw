-- P0/P1 security hardening (2026-05-18)
-- Audit findings:
--   1. profiles SELECT `using (true)` leaks phone + resume path + all PII to any
--      logged-in user. Tighten to self / admin / recruitment_owner viewing their
--      applicants. Display fields move to public_profiles via the existing sync
--      trigger so /profile/[id] cards still render for logged-in viewers.
--   2. oauth_clients anon SELECT enumerable — drop it (clients now read via
--      service-role only).
--   3. upload_tokens.access_token stores user JWT — pull the column, return
--      user_id + category only; uploads run service-role on the recorded user.
--
-- This migration is paired with code changes in:
--   apps/web/app/profile/[id]/page.tsx        (read display fields from public_profiles)
--   apps/mcp/lib/auth/oauth-clients.ts        (service-role read + host allowlist)
--   apps/mcp/lib/tools/images.ts              (drop access_token write)
--   apps/mcp/app/api/upload/route.ts          (service-role upload using stored user_id)
--   apps/mcp/lib/tools/profiles.ts            (resume path via service-role route)

-- ----------------------------------------------------------------------------
-- 1. public_profiles: mirror display fields from profiles
-- ----------------------------------------------------------------------------

ALTER TABLE public.public_profiles
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS linkedin text,
  ADD COLUMN IF NOT EXISTS facebook text,
  ADD COLUMN IF NOT EXISTS github text,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS social_links text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS role text;

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
    social_links, role
  )
  VALUES (
    NEW.id, NEW.created_at, NEW.updated_at,
    NEW.display_name, NEW.avatar_url,
    NEW.bio, NEW.linkedin, NEW.facebook, NEW.github, NEW.website,
    COALESCE(NEW.social_links, '{}'::text[]), NEW.role
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
    role         = NEW.role;
  RETURN NEW;
END;
$$;

-- backfill existing rows
UPDATE public.public_profiles pp
SET
  avatar_url   = p.avatar_url,
  bio          = p.bio,
  linkedin     = p.linkedin,
  facebook     = p.facebook,
  github       = p.github,
  website      = p.website,
  social_links = COALESCE(p.social_links, '{}'::text[]),
  role         = p.role
FROM public.profiles p
WHERE pp.id = p.id;

-- ----------------------------------------------------------------------------
-- 2. profiles SELECT: tighten to self / admin / recruitment_owner-of-applicant
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Authenticated can read profiles" ON public.profiles;

CREATE POLICY "Self, admin, or recruitment_owner can read profiles"
ON public.profiles FOR SELECT TO authenticated
USING (
  id = (SELECT auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
  )
  OR EXISTS (
    SELECT 1
    FROM public.recruitment_interests ri
    JOIN public.competition_owners co
      ON co.competition_id = ri.competition_id
    WHERE ri.user_id = profiles.id
      AND co.user_id = (SELECT auth.uid())
  )
);

-- ----------------------------------------------------------------------------
-- 3. oauth_clients: drop anon SELECT (was enabling client enumeration)
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "anon can read oauth clients" ON public.oauth_clients;
-- INSERT policy "anon can insert oauth clients" stays — DCR registration still
-- needs to land a row. Application-layer host allowlist now gates the redirect_uris.

-- ----------------------------------------------------------------------------
-- 4. upload_tokens: drop access_token column, return user_id + category only
-- ----------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.consume_upload_token(text);

ALTER TABLE public.upload_tokens
  DROP COLUMN IF EXISTS access_token;

CREATE FUNCTION public.consume_upload_token(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.upload_tokens%ROWTYPE;
BEGIN
  UPDATE public.upload_tokens
  SET used = true
  WHERE token = p_token
    AND used = false
    AND expires_at >= now()
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'user_id', v_row.user_id,
    'category', v_row.category
  );
END;
$$;

REVOKE ALL ON FUNCTION public.consume_upload_token(text) FROM public;
GRANT EXECUTE ON FUNCTION public.consume_upload_token(text) TO anon, authenticated;
