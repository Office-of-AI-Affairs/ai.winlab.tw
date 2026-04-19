# Cloudflare CDN Worker Setup

The worker under `infra/cdn-worker/` proxies `cdn.winlab.tw/*` to our Supabase
Storage public buckets and puts the Cloudflare edge cache in front. Once wired
in, repeat reads never hit Supabase — that's the rest of the egress budget
saved after the recompression pass.

## Prerequisites

- Cloudflare account owning the `winlab.tw` zone
- API token (or `wrangler login`) with:
  - `Account → Workers Scripts → Edit`
  - `Zone → DNS → Edit` (for winlab.tw)
  - `Zone → Workers Routes → Edit` (for winlab.tw)

## One-time deploy

```sh
cd infra/cdn-worker
bun install                             # installs wrangler locally
npx wrangler login                      # or export CLOUDFLARE_API_TOKEN
npx wrangler deploy                     # publishes the worker
```

On first deploy Wrangler will ask to create a Worker named `winlab-cdn`.

## Bind the `cdn.winlab.tw` hostname

In Cloudflare Dashboard:

1. **DNS** → add a `CNAME` record:
   - Name: `cdn`
   - Target: `@` (root) or anywhere in the zone — Cloudflare will overwrite
     routing via Worker.
   - Proxy status: **Proxied** (orange cloud, critical)
2. **Workers & Pages** → `winlab-cdn` → **Settings** → **Domains & Routes**
   → **Add Custom Domain** → `cdn.winlab.tw`.

Or do it directly in `wrangler.toml` by uncommenting the `routes` block and
redeploying.

## Frontend env var

Add to Vercel project env (`ai.winlab.tw`):

```
NEXT_PUBLIC_CDN_BASE_URL=https://cdn.winlab.tw
```

`lib/cdn.ts` falls back to this value when rewriting Supabase URLs. Leaving
the env unset keeps the rewrite pointed at the default (`https://cdn.winlab.tw`).

## Verify

```sh
curl -I https://cdn.winlab.tw/announcement-images/carousel/<any-object>.webp
# expect: 200, X-CDN-Hit: miss
curl -I https://cdn.winlab.tw/announcement-images/carousel/<same-object>.webp
# expect: 200, X-CDN-Hit: hit
curl -I https://cdn.winlab.tw/announcement-images/resumes/foo.pdf
# expect: 403 (resumes is private and not in ALLOWED_BUCKETS)
curl -I -H "Referer: https://evil.example" https://cdn.winlab.tw/announcement-images/carousel/…
# expect: 403 hotlink denied
```

## Rollback

If anything goes wrong, unset `NEXT_PUBLIC_CDN_BASE_URL` in Vercel → `lib/cdn.ts`
keeps returning `cdn.winlab.tw` URLs but you can temporarily patch the fallback
to pass URLs through unchanged, or disable the custom domain in Cloudflare
Workers. Worker code itself is additive — stopping it makes the CDN host fail,
but the origin URLs still work.

## Cost

Cloudflare Workers free tier: 100k req/day. We're nowhere near that.
