// Rewrite Supabase Storage public URLs to go through the Cloudflare CDN at
// cdn.winlab.tw. The Worker proxies to the Supabase origin and serves repeat
// reads from the edge, so Supabase egress stops being charged for cached hits.
//
// Any URL that isn't a recognised Supabase storage URL is returned unchanged —
// external images, placeholder paths, and already-rewritten CDN URLs pass
// through so callers can use this helper blindly.

// Opt-in via env — when unset the helper is a no-op so we can deploy this
// code before the Worker + DNS are live, then flip the switch from Vercel.
const CDN_BASE = process.env.NEXT_PUBLIC_CDN_BASE_URL?.replace(/\/+$/, "");

// Match Supabase public storage URLs:
//   https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path...>
const SUPABASE_STORAGE_RE =
  /^https?:\/\/[^\/]+\.supabase\.co\/storage\/v1\/object\/public\/([^\/]+)\/(.+)$/;

export function toCdnUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (!CDN_BASE) return url;
  if (url.startsWith(CDN_BASE)) return url;
  const m = url.match(SUPABASE_STORAGE_RE);
  if (!m) return url;
  const bucket = m[1];
  const path = m[2];
  return `${CDN_BASE}/${bucket}/${path}`;
}
