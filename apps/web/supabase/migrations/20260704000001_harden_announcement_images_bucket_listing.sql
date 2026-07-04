-- Security advisor 0025: the public `announcement-images` bucket had a broad
-- SELECT policy on storage.objects that lets any client LIST every object.
-- Public buckets serve object URLs via /storage/v1/object/public/... without any
-- RLS policy, so this listing policy is unnecessary and only widens exposure.
-- Applied to production 2026-07-04 via Supabase MCP; this file backfills the
-- repo IaC record.
drop policy if exists "Allow public read for announcement-images" on storage.objects;
