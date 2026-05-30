# Permissions Matrix

This document records the production RLS and storage permission contract for
`ai.winlab.tw`. The source of truth for the current production snapshot is
[`lib/security/rls-snapshot.json`](../lib/security/rls-snapshot.json), refreshed
with [`scripts/refresh-rls-snapshot.md`](../scripts/refresh-rls-snapshot.md).

When a migration changes RLS, update this file in the same PR as the migration
and snapshot refresh. `lib/security/rls-contracts.test.ts` fails if the snapshot
contains an RLS-enabled relation that is not documented here.

## Roles

- `anon`: no JWT.
- `authenticated`: any logged-in user.
- `user`: default profile role.
- `member`: profile role allowed to author articles.
- `vendor`: profile role; actual recruitment editing rights come from
  `competition_owners`.
- `recruitment_owner`: a user listed in `competition_owners` for a recruitment.
- `author`: a row owner such as `results.author_id` or `articles.author_id`.
- `admin`: `profiles.role = 'admin'`.
- `service role`: backend-only Supabase service role; no client policy.

## Public Content

| Relation | Read | Write |
| --- | --- | --- |
| `public.announcements` | `anon`: published. `authenticated`: published, plus admin can see drafts. | Admin can insert, update, delete. |
| `public.articles` | Published is public. Author can read own draft. Admin can read all. | Admin or author with `member` role can insert, update, delete. |
| `public.carousel_slides` | Public read. | Admin can insert, update, delete. |
| `public.contacts` | Public read. | Admin can insert, update, delete. |
| `public.events` | `anon`: published. `authenticated`: published, plus admin can see drafts. | Admin can insert, update, delete. |
| `public.introduction` | Public read. | Admin can insert and update. No delete policy. |
| `public.organization_members` | Public read. | Admin can insert, update, delete. |
| `public.privacy_policy` | Public read. | Admin can insert new versions. No update/delete policy. |
| `public.tags` | Public read. | Admin can insert, update, delete. |

## Events, Results, And Recruitment

| Relation | Read | Write |
| --- | --- | --- |
| `public.competitions` | Public read. | Admin can insert. Admin or recruitment owner can update/delete. |
| `public.competition_private_details` | Any authenticated user can read all private recruitment details, including salary, contact email, requirements, and application instructions. This is an explicit product decision confirmed on 2026-05-30: full job posting detail is login-gated, not owner-gated. | Admin or recruitment owner can insert, update, delete. |
| `public.competition_owners` | User can read own owner rows. Admin can read all. | Admin can insert/delete owner rows. |
| `public.event_participants` | Public read. Current rows expose event membership IDs, not profile PII; profile PII remains gated by `profiles`. | Admin can insert/delete. |
| `public.recruitment_interests` | Applicant can read own applications. Recruitment owner can read applications for owned recruitments. Admin can read all. | Authenticated user can insert own interest and delete own interest. |
| `public.results` | `anon`: published. `authenticated`: published, own authored rows, plus admin can see all. | Author or admin can insert, update, delete. |
| `public.result_coauthors` | Public can read coauthors on published results. A user can read their own coauthor row. Result author or admin can read draft coauthors. | Result author or admin can insert/delete. |
| `public.result_tags` | Public read. | Result author or admin can insert/delete. |
| `public.external_results` | Public read. | User can insert, update, delete own rows. No admin override policy. |

## Profiles And Private Account Data

| Relation | Read | Write |
| --- | --- | --- |
| `public.public_profiles` | Public read. Trigger-maintained display projection of `profiles`: display name, avatar, bio/social fields, role, and `has_profile_data`. Tags are intentionally not mirrored. | No client write policy. |
| `public.profiles` | Authenticated self, admin, or recruitment owner viewing an applicant for their owned recruitment. This table includes private fields such as phone and resume object path. | User can insert own profile. User can update own profile except role. Admin can update any profile. No delete policy. |

## OAuth And Upload Internals

| Relation | Read | Write |
| --- | --- | --- |
| `public.oauth_clients` | No client read policy. | `anon` can insert dynamic client registrations after format checks; redirect URI host allowlist is enforced in the MCP app layer. |
| `public.oauth_auth_codes` | Service role only. RLS is enabled with zero client policies. | Service role only. |
| `public.upload_tokens` | Service role only. | Authenticated user can create own upload token. |

## Storage

| Bucket / relation | Read | Write |
| --- | --- | --- |
| `storage.objects` / `announcement-images` | Public read. | Admin can update/delete. Insert is admin-only except `results/` accepts any authenticated upload and `recruitment/` accepts admin or recruitment owner. This exists because image paths are generated before the business row exists; cleanup relies on `scripts/cleanup-orphans.ts`. |
| `storage.objects` / `resumes` | Any authenticated user can read objects in the bucket. This is an explicit product decision confirmed on 2026-05-30; the bucket is login-gated, not owner-gated. | Authenticated users can insert, update, and delete objects only in their own first-path-segment folder (`<auth.uid()>/...`). |

## Known Boundaries

- `competition_private_details` and storage `resumes` have authenticated-wide
  read by design. Do not mark them as accidental exposures unless the product
  decision changes.
- `profiles` remains the PII boundary for phone numbers and resume object paths;
  public rendering must use `public_profiles`.
- The teams subsystem was removed on 2026-04-30. New policy work must not
  reintroduce `teams`, `team_members`, `team_invitations`, or `public_teams`.
