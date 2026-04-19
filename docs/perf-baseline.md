# Perf baseline — 2026-04-19

Snapshot after the Sprint 1–11 refactor (resumes-private-bucket, SSG/ISR
rollout, WebP compression pass, orphan cleanup, strict DB types, E2E
suite, error boundaries, LCP/CLS micro-tuning). Re-run after any
meaningful perf-touching change to compare.

Methodology:

- **Lighthouse 13** via `bunx --bun lighthouse <url> --chrome-flags="--headless=new --no-sandbox"`
- Tested from this machine (Taipei) against prod (`https://ai.winlab.tw`),
  which currently serves from the `hkg1` Vercel edge region
- Mobile emulation (Lighthouse default), single run per page
- Scores vary ±5 between runs; treat this table as a rough calibration
  rather than a regression threshold

## Lighthouse (prod)

First column is the initial snapshot, second is after the
carousel-priority / EventCard-priority / AVIF / OrgChart min-height
commit landed (`e084583`).

| Page | Perf | LCP | CLS | Notes |
|------|-----:|-----|-----|------|
| `/` | 85 → 84 | 4.4 → **3.8 s** | 0 → 0 | Carousel `priority` paid out (-600 ms LCP) |
| `/introduction` | 87 → 87 | 3.0 → 3.0 s | 0.17 → 0.17 | OrgChart min-h didn't move CLS — source is elsewhere (see below) |
| `/announcement` | 97 → 97 | 2.6 → 2.6 s | 0 → 0 | Already excellent; nothing to tune |
| `/events` | 81 → 81 | 4.6 → 4.5 s | 0 → 0 | First-card `priority` didn't move LCP meaningfully |
| `/events/ai-rising-star` | 78 → 78 | 6.0 → 6.0 s | 0 → 0 | 13 result cards still competing; needs deeper work |

Full first-pass scores on all four categories, for reference:

| Page | Perf | A11y | BP | SEO | FCP | TBT |
|------|-----:|-----:|---:|----:|-----|-----|
| `/` | 85 | 96 | 100 | 100 | 0.9 s | 10 ms |
| `/introduction` | 87 | 100 | 100 | 100 | 0.9 s | 20 ms |
| `/announcement` | 97 | 100 | 100 | 100 | 0.9 s | 10 ms |
| `/events` | 81 | 96 | 100 | 100 | 1.1 s | 20 ms |
| `/events/ai-rising-star` | 78 | 96 | 100 | 100 | 1.4 s | 40 ms |

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

## What we tried + what it bought

Commit `e084583`:

1. ✅ `priority` + `<Image>` on the first carousel slide — homepage LCP
   moved 4.4 → 3.8 s (-600 ms). Real.
2. ⚠️ `priority` on the first `EventCard` in `HomeEvents` + the events
   list — no measurable change. The LCP element on those pages likely
   isn't the cover image; the result grid on `/events/ai-rising-star`
   probably has 13 images racing to render and the "largest" one
   loses. A deeper fix would mean `loading="eager"` on the first visible
   row and `sizes` tuned for the grid, but diminishing returns from here.
3. ⚠️ `images.formats = [avif, webp]` — barely moves the needle. The
   compression pass earlier today already cut storage 24.6 → 2.6 MB as
   WebP; re-encoding to AVIF on top only buys a few hundred bytes per
   image.
4. ⚠️ OrgChart `min-h-[360px/420px]` — CLS on `/introduction` stayed
   at 0.17. The shift isn't coming from OrgChart (its SVG is absolute-
   positioned and doesn't affect flow). Suspects next session:
   `nuqs` tab-parser hydration swapping the default tab after the first
   paint, or the org-member grid laying out after Gravatar fallbacks
   settle on dimensions. Needs Lighthouse's `layout-shift-elements`
   detail to pin down.

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
