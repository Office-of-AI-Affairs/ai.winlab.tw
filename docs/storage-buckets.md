# Supabase Storage layout

Two buckets: one public, one private. Resumes used to live as a folder
in `announcement-images` until April 2026 — the split is non-optional
now, both buckets have dedicated RLS and the migration scripts assume
the current layout.

## `announcement-images` (public)

Everything visitor-facing. Public SELECT, authenticated INSERT, admin
UPDATE + DELETE.

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
- Cache-Control is `31536000` (1y, immutable) — safe because filenames
  carry a timestamp + random suffix, never reused

### RLS (storage.objects on this bucket)

| Policy                                     | Role            | Action | Guard                                         |
|--------------------------------------------|-----------------|--------|-----------------------------------------------|
| Allow public read for announcement-images  | `public`        | SELECT | bucket match                                  |
| Allow authenticated uploads                | `authenticated` | INSERT | bucket match                                  |
| Admin can update announcement-images       | `authenticated` | UPDATE | bucket match + `profiles.role = 'admin'`      |
| Admin can delete announcement-images       | `authenticated` | DELETE | bucket match + `profiles.role = 'admin'`      |

## `resumes` (private)

PDF-only, per-user folder. Authenticated users can upload their own;
only the owner or an admin can read (gated via the `/profile/[id]/resume`
route handler which proxies the download).

```
resumes/
└── <userId>/
    └── <timestamp>-<rand>.pdf
```

- 10 MB size limit, `application/pdf` only
- `profiles.resume` stores the **object path** (`<uid>/<file>.pdf`),
  never a full URL — the old URL-in-column format was swapped out in
  April 2026

### RLS (storage.objects on this bucket)

| Policy                      | Role            | Action | Guard                                                     |
|-----------------------------|-----------------|--------|-----------------------------------------------------------|
| resumes_insert_own          | `authenticated` | INSERT | bucket + `storage.foldername(name)[1] = auth.uid()::text` |
| resumes_update_own          | `authenticated` | UPDATE | same                                                       |
| resumes_delete_own          | `authenticated` | DELETE | same                                                       |
| resumes_select_authenticated| `authenticated` | SELECT | bucket match                                               |

Unauthenticated reads hit zero rows — the old public URLs no longer work.

## Maintenance scripts

Three one-off scripts in `scripts/` (gitignored; kept in git with `-f`).
All three reuse the `CLAUDE_AGENT_*` credentials in `.env.local` to sign
in as the admin agent.

### `scripts/recompress-images.ts`

Covers **direct-column** image URLs:
`carousel_slides.image`, `events.cover_image`, `competitions.image`,
`results.header_image`, `organization_members.image`,
`external_results.image`.

- Dry-run by default
- Skips files already WebP or under 200 KB
- Uploads the WebP alongside, updates the DB column, deletes the old
  object

Run: `bun scripts/recompress-images.ts [--only <table>]` then
`bun scripts/recompress-images.ts` without `--dry-run` to execute.
(Dry-run is the default here because passing `--dry-run` would make the
flag a no-op — read the source if in doubt.)

### `scripts/recompress-tiptap-images.ts`

Walks `{ type: "image", attrs: { src } }` nodes inside
`announcements.content`, `results.content`, `introduction.content`.
Same compression rules. Rewrites every jsonb reference across every
affected row when a URL changes.

- Dry-run by default
- Pass `--execute` to actually change anything

### `scripts/cleanup-orphans.ts`

Finds storage objects nothing references (direct columns + Tiptap
embeds scanned). Writes full candidate list to
`/tmp/orphan-cleanup-<timestamp>.json` for audit.

- Dry-run by default; `--execute` to delete
- `resumes/*` is intentionally excluded
- Safe to re-run — idempotent

### Run order

When a new mess of uploads accumulates:

```
bun scripts/recompress-images.ts               # dry-run
bun scripts/recompress-images.ts               # run if it looks right
bun scripts/recompress-tiptap-images.ts        # dry-run
bun scripts/recompress-tiptap-images.ts --execute
bun scripts/cleanup-orphans.ts                 # dry-run
bun scripts/cleanup-orphans.ts --execute
```

## Snapshot (April 2026 cleanup pass)

```
Before:  announcement-images 197 MB / 284 objects
         resumes              (lived in announcement-images/resumes/)

After:   announcement-images  13 MB / 101 objects
         resumes               16 MB / 15 objects
```

Free-tier (1 GB) utilisation dropped from the warning threshold into
single-digit percent. Egress follows because every served byte got
smaller and there are fewer of them.
