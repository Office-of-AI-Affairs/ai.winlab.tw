---
name: rls-permissions
description: Use BEFORE changing any RLS policy, writing a Supabase migration, auditing who can read/write what, or refreshing the RLS contract snapshot on ai.winlab.tw. This is the canonical permissions matrix — change this first, get it reviewed, THEN write the migration. Triggers on "RLS", "row level security", "permissions", "policies", "pg_policy", "security audit", "who can read", "migration", "competition_owners", "auth.uid", "snapshot drift", "rls-snapshot.json".
---

# Permissions Matrix — ai.winlab.tw

Production snapshot reverse-engineered from `pg_policy` (last sync 2026-05-18). Treat [`docs/permissions.md`](../../../docs/permissions.md) as the reviewable source document and this skill as the quick operational copy: any RLS / storage policy change must update the permissions document first, get reviewed, THEN ship the migration. CI's `lib/security/rls-contracts.test.ts` runs assertions against `lib/security/rls-snapshot.json`; drift = red build.

## Workflow

1. Read the matrix to confirm current state.
2. Update `docs/permissions.md` and this skill to reflect intended new state.
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
`event_participants` — SELECT all public (user_id list only — no PII; PII reconstruction blocked at `profiles` layer 2026-05-18). INSERT/DELETE: admin only.
`competitions` (recruitment public) — SELECT all public. INSERT: admin. UPDATE/DELETE: recruitment_owner of that recruitment, admin.
`public_profiles` (view-like table, trigger-maintained from `profiles`) — SELECT all. INSERT/UPDATE/DELETE: ❌ no policy. **Schema 2026-05-18**: now mirrors display fields (display_name, avatar_url, bio, linkedin, facebook, github, website, social_links, role, has_profile_data). `tags` NOT mirrored — admin-only label.

## Authenticated-only

`profiles` (incl. phone / resume path) — SELECT: **self / admin / recruitment_owner viewing their own recruitment's applicant rows**. INSERT: self. UPDATE: self (cannot change role) / admin all. DELETE: ❌ no policy. **Tightened 2026-05-18** from `using (true)` — phone + resume path are real PII. Display fields (bio / linkedin / facebook / github / website / social_links / role / avatar_url) live in `public_profiles` via the sync trigger so logged-in viewers can still render `/profile/[id]` cards. `tags` deliberately NOT mirrored.

`competition_private_details` — SELECT: any logged-in user reads all (incl. salary / email / requirements). **Decision**: full job posting visible to logged-in is product intent, reconfirmed by Loki on 2026-05-30. INSERT/UPDATE/DELETE: recruitment_owner, admin.

`competition_owners` — SELECT: own rows / admin all. INSERT/DELETE: admin only.

`recruitment_interests` — SELECT: own applications / recruitment_owner sees own recruitment's applicants / admin all. INSERT: self. DELETE: own applications.

`upload_tokens` — SELECT: ❌ service role only. INSERT: self. **Schema 2026-05-18**: `access_token` column removed — `consume_upload_token` RPC now returns user_id + category only, upload route uses service-role storage upload on behalf of the recorded user_id (no JWT replay).

`oauth_clients` — INSERT: anon (with format check + **`redirect_uris` host allowlist enforced application-layer in `apps/mcp/lib/auth/oauth-clients.ts`** 2026-05-18). SELECT: ❌ anon read removed 2026-05-18 (was `using (true)`, was leaking client enumeration). **Cross-repo use**: MCP server (`~/mcp.ai.winlab.tw`) uses OAuth Dynamic Client Registration (RFC 7591). Don't touch from this repo.

`oauth_auth_codes` — All ops ❌ (service role only).

## Storage Buckets

`announcement-images` (public) — SELECT all. INSERT split by path prefix (2026-05-05 `20260505000001`):

| Prefix | INSERT allowed |
|---|---|
| `<root>` (announcements) | admin |
| `carousel/` | admin |
| `events/` | admin |
| `organization/` | admin |
| `external-results/` | admin |
| `results/` | any authenticated (rationale: `results` row INSERT RLS already gates `author_id = self`; image path is generated before the row exists, so storage can't join the business table) |
| `recruitment/` | admin OR row in `competition_owners` (recruitment_owner of any recruitment) |

UPDATE/DELETE: admin only across the whole bucket. **Trade-off**: `results/` prefix accepts any authenticated upload — path-time row ownership can't be verified because the URL is needed before the row exists. Mitigations: orphan cleanup script (`scripts/cleanup-orphans.ts`), random filename, `upsert: false`.

`resumes` (private) — SELECT: any logged-in user can read objects in the bucket. INSERT/UPDATE/DELETE: own folder (`name` first segment = `auth.uid()`). **Decision**: bucket read is login-gated, not owner-gated, reconfirmed by Loki on 2026-05-30. `profiles` still gates the stored resume object path.

## Tooling

- Contract test `lib/security/rls-contracts.test.ts` against `lib/security/rls-snapshot.json` — catches drift, dropped tables coming back, critical SELECT widening.
- Snapshot refresh `scripts/refresh-rls-snapshot.md` — SQL to regenerate JSON. Run after every RLS migration.
- Future: `lib/security/rls-runtime.test.ts` with `SET LOCAL ROLE` once `DATABASE_URL` is in CI secrets.

## Related skills

- `supabase-storage` — bucket layout + maintenance scripts
- `isr-page` — public pages depend on these policies for cookieless `createPublicClient`
