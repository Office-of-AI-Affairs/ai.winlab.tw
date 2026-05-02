---
name: rls-permissions
description: Use BEFORE changing any RLS policy, writing a Supabase migration, auditing who can read/write what, or refreshing the RLS contract snapshot on ai.winlab.tw. This is the canonical permissions matrix — change this first, get it reviewed, THEN write the migration. Triggers on "RLS", "row level security", "permissions", "policies", "pg_policy", "security audit", "who can read", "migration", "competition_owners", "auth.uid", "snapshot drift", "rls-snapshot.json".
---

# Permissions Matrix — ai.winlab.tw

Production snapshot reverse-engineered from `pg_policy` (last sync 2026-04-30). Treat as canonical contract: any RLS / storage policy change must update this skill first, get reviewed, THEN ship the migration. CI's `lib/security/rls-contracts.test.ts` runs assertions against `lib/security/rls-snapshot.json`; drift = red build.

## Workflow

1. Read the matrix to confirm current state.
2. Update this skill to reflect intended new state.
3. Get reviewed before writing the migration.
4. Write the migration in `supabase/migrations/` (timestamp prefix).
5. Apply via Supabase SQL Editor (never via dashboard policy UI — CI catches drift).
6. Refresh snapshot: run SQL in `scripts/refresh-rls-snapshot.md`, paste into `lib/security/rls-snapshot.json`.
7. Run `bun run check` — `rls-contracts.test.ts` should pass.

Naming convention: `<role/scope> can <op> <resource>` (e.g. `Admin can update events`). Avoid `Authenticated can read X` once nuance exists.

## Roles

- **anon** — no JWT, public reads only
- **user** — `profiles.role = 'user'` (default)
- **vendor** — `profiles.role = 'vendor'`. Tag is informational; real perms via `competition_owners` pivot
- **recruitment_owner** — row in `competition_owners`. Edits that recruitment + sees its applicants
- **author** — `results.author_id = auth.uid()`
- **admin** — `profiles.role = 'admin'`. Platform-wide

Role swap requires admin. Teams subsystem retired 2026-04-30.

## Legend

✅ allowed / ❌ denied / "self" = `auth.uid() = id / user_id / author_id` / "published" = `status = 'published'`

## Public-readable (anon allowed)

`announcements` — anon: published / user: published + admin sees draft / admin: ✅. INSERT/UPDATE/DELETE: admin only.
`events` — anon/user: published. INSERT/UPDATE/DELETE: admin only.
`results` — anon: published / user/author: published + self. INSERT/UPDATE/DELETE: author self, admin ✅.
`external_results` — SELECT all public. INSERT/UPDATE/DELETE: self only (no admin override).
`result_coauthors` — SELECT: anon sees published-result coauthors; user sees self OR result published OR you're author OR admin. INSERT/DELETE: result's author self. (Tightened 2026-04-30 `20260430000007`.)
`result_tags` — SELECT all public. INSERT/DELETE: result's author self.
`tags` — SELECT all. INSERT/UPDATE/DELETE: admin only.
`introduction` (single row) — SELECT all. INSERT/UPDATE: admin. DELETE: ❌ no policy.
`carousel_slides` / `contacts` / `organization_members` — SELECT all. CRUD: admin only.
`privacy_policy` (versioned, append-only) — SELECT all. INSERT: admin. UPDATE/DELETE: ❌ no policy.
`event_participants` — SELECT all public. INSERT/DELETE: admin only.
`competitions` (recruitment public) — SELECT all public. INSERT: admin. UPDATE/DELETE: recruitment_owner of that recruitment, admin.
`public_profiles` (view) — SELECT all. INSERT/UPDATE/DELETE: ❌ no policy (trigger-maintained).

## Authenticated-only

`profiles` (incl. phone / resume path) — SELECT: user reads all (incl. others' phone / social_links / bio) / admin all. INSERT: self. UPDATE: self (cannot change role) / admin all. DELETE: ❌ no policy. **Trade-off**: phone / social_links / bio public to logged-in users (commit `d3e6ca4`).

`competition_private_details` — SELECT: any logged-in user reads all (incl. salary / email / requirements). **Decision**: full job posting visible to logged-in is product intent (2026-04-30). INSERT/UPDATE/DELETE: recruitment_owner, admin.

`competition_owners` — SELECT: own rows / admin all. INSERT/DELETE: admin only.

`recruitment_interests` — SELECT: own applications / recruitment_owner sees own recruitment's applicants / admin all. INSERT: self. DELETE: own applications.

`upload_tokens` — SELECT: ❌ service role only. INSERT: self.

`oauth_clients` — SELECT/INSERT: anon ✅ (with format check). **Cross-repo use**: MCP server (`~/mcp.ai.winlab.tw`) uses OAuth Dynamic Client Registration (RFC 7591). Don't touch from this repo.

`oauth_auth_codes` — All ops ❌ (service role only).

## Storage Buckets

`announcement-images` (public) — SELECT all. INSERT/UPDATE/DELETE: admin only (tightened 2026-04-30 `20260430000006`).

`resumes` (private) — SELECT: user reads all (incl. others' PDFs) / admin all. INSERT/UPDATE/DELETE: own folder (`name` first segment = `auth.uid()`). **Trade-off**: any logged-in user can download any resume (commit `96cba86`). Gated via `/profile/[id]/resume` route handler.

## Tooling

- Contract test `lib/security/rls-contracts.test.ts` against `lib/security/rls-snapshot.json` — catches drift, dropped tables coming back, critical SELECT widening.
- Snapshot refresh `scripts/refresh-rls-snapshot.md` — SQL to regenerate JSON. Run after every RLS migration.
- Future: `lib/security/rls-runtime.test.ts` with `SET LOCAL ROLE` once `DATABASE_URL` is in CI secrets.

## Related skills

- `supabase-storage` — bucket layout + maintenance scripts
- `isr-page` — public pages depend on these policies for cookieless `createPublicClient`
