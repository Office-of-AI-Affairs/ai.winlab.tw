---
name: supabase-storage
description: Use when uploading images, working with the announcement-images or resumes bucket on ai.winlab.tw, running orphan cleanup, recompressing images to WebP, or maintaining storage egress. Triggers on "upload image", "WebP", "browser-image-compression", "announcement-images", "resumes bucket", "recompress", "orphan cleanup", "storage egress", "Tiptap embed", "header image", "carousel image".
---

# Supabase Storage layout

Two buckets: one public, one private. Resumes used to live as a folder in `announcement-images` until April 2026 — split is non-optional now, both buckets have dedicated RLS, migration scripts assume current layout.

## `announcement-images` (public)

Visitor-facing images. Public SELECT, admin-only INSERT/UPDATE/DELETE (tightened 2026-04-30).

```
announcement-images/
├── <announcement-*.webp>       # root = announcement body images
├── carousel/                   # homepage hero slides
├── events/                     # event cover images
├── results/                    # result headers + Tiptap embeds
├── recruitment/                # competition cover images
├── organization/               # team member photos
└── external-results/           # ExternalResult body images
```

### Upload conventions

- Client-side uploads go through `lib/upload-image.ts`
- `browser-image-compression` runs before upload: max 1920px, WebP, q80
- Files under 200 KB are passed through unchanged
- `Cache-Control: 31536000` (1y, immutable) — safe because filenames carry timestamp + random suffix, never reused

### RLS (storage.objects on this bucket)

| Policy | Role | Action | Guard |
|---|---|---|---|
| Allow public read for announcement-images | `public` | SELECT | bucket match |
| Admin can insert announcement-images | `authenticated` | INSERT | bucket match + `profiles.role = 'admin'` |
| Admin can update announcement-images | `authenticated` | UPDATE | bucket match + `profiles.role = 'admin'` |
| Admin can delete announcement-images | `authenticated` | DELETE | bucket match + `profiles.role = 'admin'` |

## `resumes` (private)

PDF-only, per-user folder. Authenticated users upload their own; only owner or admin can read (gated via `/profile/[id]/resume` route handler that proxies the download).

```
resumes/
└── <userId>/
    └── <timestamp>-<rand>.pdf
```

- 10 MB size limit, `application/pdf` only
- `profiles.resume` stores the **object path** (`<uid>/<file>.pdf`), never a full URL — old URL-in-column format swapped out April 2026

### RLS (storage.objects on this bucket)

| Policy | Role | Action | Guard |
|---|---|---|---|
| resumes_insert_own | `authenticated` | INSERT | bucket + `storage.foldername(name)[1] = auth.uid()::text` |
| resumes_update_own | `authenticated` | UPDATE | same |
| resumes_delete_own | `authenticated` | DELETE | same |
| resumes_select_authenticated | `authenticated` | SELECT | bucket match |

Unauthenticated reads hit zero rows — old public URLs no longer work.

## Maintenance scripts

Three one-off scripts in `scripts/` (gitignored; kept in git with `-f`). All three reuse the `CLAUDE_AGENT_*` credentials in `.env.local` to sign in as the admin agent.

### `scripts/recompress-images.ts`

Covers **direct-column** image URLs: `carousel_slides.image`, `events.cover_image`, `competitions.image`, `results.header_image`, `organization_members.image`, `external_results.image`.

- Dry-run by default
- Skips files already WebP or under 200 KB
- Uploads the WebP alongside, updates the DB column, deletes the old object

```sh
bun scripts/recompress-images.ts [--only <table>]   # dry-run
bun scripts/recompress-images.ts                    # execute
```

(Dry-run is default — passing `--dry-run` would make the flag a no-op. Read the source if in doubt.)

### `scripts/recompress-tiptap-images.ts`

Walks `{ type: "image", attrs: { src } }` nodes inside `announcements.content`, `results.content`, `introduction.content`. Same compression rules. Rewrites every jsonb reference across every affected row when a URL changes.

- Dry-run by default
- Pass `--execute` to commit changes

### `scripts/cleanup-orphans.ts`

Finds storage objects nothing references (direct columns + Tiptap embeds scanned). Writes full candidate list to `/tmp/orphan-cleanup-<timestamp>.json` for audit.

- Dry-run by default; `--execute` to delete
- `resumes/*` intentionally excluded
- Safe to re-run — idempotent

### Run order when uploads accumulate

```sh
bun scripts/recompress-images.ts                # dry-run
bun scripts/recompress-images.ts                # execute
bun scripts/recompress-tiptap-images.ts         # dry-run
bun scripts/recompress-tiptap-images.ts --execute
bun scripts/cleanup-orphans.ts                  # dry-run
bun scripts/cleanup-orphans.ts --execute
```

## CDN

`cdn.winlab.tw` proxies the public bucket via Cloudflare Worker. `lib/cdn.ts`'s `toCdnUrl()` rewrites Supabase public URLs to the CDN domain. See `cdn-deploy` skill for worker setup.

## Snapshot (April 2026 cleanup pass)

```
Before:  announcement-images 197 MB / 284 objects
         resumes              (lived in announcement-images/resumes/)

After:   announcement-images  13 MB / 101 objects
         resumes               16 MB / 15 objects
```

Free-tier (1 GB) utilisation dropped from warning threshold into single-digit percent. Egress follows because every served byte got smaller and there are fewer of them.

## Related skills

- `rls-permissions` — full bucket RLS context
- `cdn-deploy` — Cloudflare worker that fronts the public bucket
