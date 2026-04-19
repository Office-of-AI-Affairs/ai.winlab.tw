# Perf baseline — 2026-04-19

Snapshot after the Sprint 1–9 refactor (resumes-private-bucket, SSG/ISR
rollout, WebP compression pass, orphan cleanup, strict DB types, E2E
suite, error boundaries). Re-run after any meaningful perf-touching
change to compare.

Methodology:

- **Lighthouse 13** via `bunx --bun lighthouse <url> --chrome-flags="--headless=new --no-sandbox"`
- Tested from this machine (Taipei) against prod (`https://ai.winlab.tw`),
  which currently serves from the `hkg1` Vercel edge region
- Mobile emulation (Lighthouse default), single run per page
- Scores vary ±5 between runs; treat this table as a rough calibration
  rather than a regression threshold

## Lighthouse (prod)

| Page | Perf | A11y | BP | SEO | FCP | LCP | TBT | CLS |
|------|-----:|-----:|---:|----:|-----|-----|-----|-----|
| `/` | 85 | 96 | 100 | 100 | 0.9 s | 4.4 s | 10 ms | 0 |
| `/introduction` | 87 | 100 | 100 | 100 | 0.9 s | 3.0 s | 20 ms | 0.17 |
| `/announcement` | 97 | 100 | 100 | 100 | 0.9 s | 2.6 s | 10 ms | 0 |
| `/events` | 81 | 96 | 100 | 100 | 1.1 s | 4.6 s | 20 ms | 0 |
| `/events/ai-rising-star` | 78 | 96 | 100 | 100 | 1.4 s | 6.0 s | 40 ms | 0 |

### Reading the numbers

- **FCP 0.9–1.4 s, TBT 10–40 ms, CLS ≤ 0 (mostly)**: server-rendered HTML
  ships fast and doesn't block the main thread. The ISR refactor is doing
  its job.
- **Best Practices / SEO / A11y perfect or near-perfect**: metadata,
  structured data, semantic headings, colour contrast, canonical URLs,
  OpenGraph tags all already in place.
- **LCP 2.6 s – 6.0 s, driving the Perf score**: the biggest element on
  every page is a hero image — carousel slide on `/`, cover image on
  `/events/…`. Post-compression they're still large relative to the
  mobile network budget, and Next/Image isn't marking them `priority`
  or serving AVIF. Biggest single lever left.
- **CLS 0.17 on `/introduction`**: the OrgChart component draws after
  the initial paint and pushes other sections down. Low-effort fix:
  reserve its aspect-ratio up front.

## Bundle audit

`@next/bundle-analyzer` is wired in — `bun run analyze` runs
`ANALYZE=true next build` so we can invoke it later. Next 16 Turbopack
doesn't emit the classic per-route tree map that webpack builds
produced; inspecting the chunks directly:

```
.next/static/chunks:  2.9 MB on disk (58 chunks)
Shared across pages:   401 KB in 6 files (rootMain)

Top chunks:
  412 KB  — framework / editor vendor bundle
  220 KB  — React + Next runtime
  200 KB  — Supabase client
  112 KB  — Radix primitives + shadcn
   84 KB  — helpers / utilities
```

A visitor hitting `/` downloads roughly the 401 KB shared bundle plus
whatever page-specific chunk the route resolves to. Per-route
attribution under Turbopack needs a follow-up dig; the per-chunk
breakdown above is enough signal to know nothing's pathologically out
of place.

## Known next-steps for LCP

The biggest Perf delta we'd gain is cutting LCP on the hero pages
(homepage, `/events`, `/events/[slug]`):

1. **`priority` on hero images** — Next/Image lazy-loads by default.
   `HomeCarousel`'s first slide and `EventCard`'s cover should render
   with `priority` so the browser requests them immediately.
2. **Serve AVIF alongside WebP** — Next/Image will do this automatically
   once `images.formats: ["image/avif", "image/webp"]` is set in
   `next.config.ts`; currently the config relies on defaults.
3. **Preload the first carousel slide** — a `<link rel="preload">` in
   the head for the known first-slide URL would make the LCP image
   cacheable before the carousel JS decides to paint.
4. **Reserve the OrgChart height** — add a fixed aspect-ratio box so
   CLS on `/introduction` drops from 0.17 to 0.

None of these change behaviour for admins or DB state, so they're safe
incremental follow-ups. Re-run Lighthouse afterwards and update this
table.

## Re-running

```sh
# Full suite
for p in / /introduction /announcement /events /events/ai-rising-star; do
  bunx --bun lighthouse "https://ai.winlab.tw$p" \
    --chrome-flags="--headless=new --no-sandbox" \
    --output=json \
    --output-path="/tmp/lh-$(echo "$p" | tr / -).json" \
    --quiet
done

# Local bundle check
bun run analyze
```
