---
name: perf-audit
description: Use when running a Lighthouse audit against ai.winlab.tw, comparing perf scores after a perf-touching change, or analyzing the bundle. Triggers on "Lighthouse", "perf check", "perf regression", "LCP", "CLS", "FCP", "bundle analyzer", "next/bundle-analyzer", "perf baseline", "carousel priority", "AVIF".
---

# Perf audit — ai.winlab.tw

How to run Lighthouse against prod and read the numbers, plus the last published baseline for regression comparison.

## When this skill applies

- Before/after a perf-touching change (image priority, AVIF, lazy load, code split).
- Investigating a Lighthouse regression flag.
- Auditing bundle size after a dependency upgrade.

## Methodology

- **Lighthouse 13** via `bunx --bun lighthouse`
- Tested from the dev machine (Taipei) against prod (`https://ai.winlab.tw`), which serves from the `hkg1` Vercel edge region
- Mobile emulation (Lighthouse default), single run per page
- Scores vary ±5 between runs — treat tables as rough calibration, not regression thresholds

## Run the suite

```sh
for p in / /introduction /announcement /events /events/ai-rising-star; do
  bunx --bun lighthouse "https://ai.winlab.tw$p" \
    --chrome-flags="--headless=new --no-sandbox" \
    --output=json \
    --output-path="/tmp/lh-$(echo "$p" | tr / -).json" \
    --quiet
done
```

## Bundle audit

```sh
bun run analyze    # ANALYZE=true next build
```

`@next/bundle-analyzer` is wired in `next.config.ts`. Note: Next 16 Turbopack doesn't emit the classic per-route tree map that webpack builds produced. Inspect chunks directly:

```
.next/static/chunks/                    # 2.9 MB on disk (58 chunks at last check)
Shared across pages:                    401 KB in 6 files (rootMain)

Top chunks:
  412 KB  — framework / editor vendor bundle
  220 KB  — React + Next runtime
  200 KB  — Supabase client
  112 KB  — Radix primitives + shadcn
   84 KB  — helpers / utilities
```

## Last baseline (2026-04-19, after Sprint 1–11 + commit `e084583`)

| Page | Perf | LCP | CLS | Notes |
|------|-----:|-----|-----|------|
| `/` | 84 | 3.8 s | 0 | Carousel `priority` paid out (-600 ms LCP) |
| `/introduction` | 87 | 3.0 s | 0.17 | OrgChart min-h didn't move CLS — source elsewhere |
| `/announcement` | 97 | 2.6 s | 0 | Already excellent |
| `/events` | 81 | 4.5 s | 0 | First-card `priority` didn't move LCP meaningfully |
| `/events/ai-rising-star` | 78 | 6.0 s | 0 | 13 result cards still competing; deeper work needed |

Full first-pass scores:

| Page | Perf | A11y | BP | SEO | FCP | TBT |
|------|-----:|-----:|---:|----:|-----|-----|
| `/` | 85 | 96 | 100 | 100 | 0.9 s | 10 ms |
| `/introduction` | 87 | 100 | 100 | 100 | 0.9 s | 20 ms |
| `/announcement` | 97 | 100 | 100 | 100 | 0.9 s | 10 ms |
| `/events` | 81 | 96 | 100 | 100 | 1.1 s | 20 ms |
| `/events/ai-rising-star` | 78 | 96 | 100 | 100 | 1.4 s | 40 ms |

## Reading the numbers

- **FCP 0.9–1.4 s, TBT 10–40 ms, CLS ≤ 0 (mostly)** — server-rendered HTML ships fast and doesn't block main thread. ISR refactor doing its job.
- **A11y / BP / SEO perfect or near** — metadata, structured data, semantic headings, contrast, canonical URLs, OG tags all in place.
- **LCP 2.6 – 6.0 s** drives Perf — biggest element on every page is a hero image. Post-compression they're still large for the mobile budget. Biggest single lever left.
- **CLS 0.17 on `/introduction`** — OrgChart draws after initial paint. Suspects: `nuqs` tab-parser hydration swapping default tab, or org-member grid laying out after Gravatar fallbacks settle. Needs Lighthouse's `layout-shift-elements` detail to pin down.

## What was tried + bought (commit `e084583`)

1. ✅ `priority` + `<Image>` on first carousel slide — homepage LCP 4.4 → 3.8 s. Real.
2. ⚠️ `priority` on first `EventCard` in `HomeEvents` + events list — no measurable change. LCP element on those pages likely isn't the cover; result grid on `/events/ai-rising-star` has 13 images racing. Deeper fix would mean `loading="eager"` on first visible row + `sizes` tuned for the grid; diminishing returns.
3. ⚠️ `images.formats = [avif, webp]` — barely moves the needle. WebP compression pass already cut storage 24.6 → 2.6 MB; AVIF on top buys a few hundred bytes per image.
4. ⚠️ OrgChart `min-h-[360px/420px]` — CLS on `/introduction` stayed 0.17. SVG is absolute-positioned, doesn't affect flow. Suspects above.

## Related skills

- `supabase-storage` — image compression + CDN setup (egress side)
- `isr-page` — the architecture that gives FCP/TBT their headroom
