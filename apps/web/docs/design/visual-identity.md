# Visual Identity Spec

Status: accepted. This is the tokens contract for the "UI System Refresh"
milestone. Every later issue in the milestone (#51 radius, #52 brand color,
and anything that follows) implements a section of this document and cites
that section as its acceptance criteria.

Companion files:

- `apps/web/app/globals.css` — runtime tokens (`@theme` block, CSS custom
  properties). This spec is the source of *intent*; `globals.css` is the
  source of *implementation*. If they disagree, `globals.css` is wrong.
- `apps/web/DESIGN.md` — the pre-existing component-level design doc
  (layout shells, component variants, do's/don'ts). It cites this spec
  for radius/color rationale and exact values instead of duplicating
  them (see "Reconciliation with `DESIGN.md`" at the end of this doc).

## Color

Brand: NYCU Royal Blue, `#0033A0`. Converted to OKLCH using the standard
sRGB → linear → Oklab → OKLCH pipeline (Björn Ottosson's reference
matrices), not eyeballed:

```
#0033A0 -> oklch(0.378 0.182 262.51)
```

Round-trip verified: `oklch(0.378 0.182 262.51)` converts back to
`#0033a0` exactly.

### Light mode

| Token | Value | Notes |
|---|---|---|
| `--primary` | `oklch(0.378 0.182 262.51)` | NYCU blue, exact conversion of `#0033A0` |
| `--primary-foreground` | `oklch(1 0 0)` | white text on primary; contrast ratio 10.6:1 (AA) |
| `--ring` | `oklch(0.6 0.04 262.51)` | primary hue, low chroma; 3.9:1 against white background |

### Dark mode

Dark mode does not drop the brand (the current bug in `globals.css`
reverts `--primary` to stock zinc white in `.dark`). It gets a brand
variant on the **same hue** (`262.51`), lightness raised and chroma
slightly reduced so it reads clearly on dark surfaces:

| Token | Value | Notes |
|---|---|---|
| `--primary` | `oklch(0.65 0.15 262.51)` | same hue as light mode; L raised from 0.378 to 0.65 for dark-surface legibility |
| `--primary-foreground` | `oklch(0.145 0 0)` | dark text (matches `--background` dark value); contrast ratio 6.0:1 against `--primary` (AA) |
| `--ring` | `oklch(0.556 0.05 262.51)` | primary hue, low chroma; 4.2:1 against dark background |

Contrast requirements for every semantic color pairing in this system:
**4.5:1 (AA) for body text**, **3:1 for large text / UI elements**
(borders, focus rings, icons). Both `--primary` pairings above clear AA
text contrast; both `--ring` values clear the 3:1 UI threshold against
their respective page background.

### Chart palette

`--chart-1..5` are derived from the brand hue family: three steps in the
brand hue (`262.51`, varying lightness/chroma) plus two supporting hues
(a cool teal complement and a warm amber accent) for categorical
distinction. Defined for both modes so charts don't go gray in dark mode
like the stock shadcn defaults did.

| Token | Light | Dark | Role |
|---|---|---|---|
| `--chart-1` | `oklch(0.55 0.18 262.51)` | `oklch(0.65 0.16 262.51)` | primary brand blue |
| `--chart-2` | `oklch(0.66 0.12 262.51)` | `oklch(0.78 0.10 262.51)` | pale brand blue |
| `--chart-3` | `oklch(0.32 0.14 262.51)` | `oklch(0.50 0.16 262.51)` | deep brand blue |
| `--chart-4` | `oklch(0.58 0.13 195)` | `oklch(0.70 0.13 195)` | supporting hue: teal |
| `--chart-5` | `oklch(0.66 0.15 70)` | `oklch(0.80 0.15 70)` | supporting hue: amber |

All ten values were checked for ≥3:1 contrast against their mode's
`--background` (non-text UI threshold for chart fills/lines).

### Semantic roles (unchanged by this milestone)

`background` / `foreground`, `card` / `card-foreground`, `muted` /
`muted-foreground`, `destructive`, `border` / `input` keep their current
grayscale OKLCH values — this spec doesn't touch them. `secondary` stays
the flat gray "draft" surface it already is.

### Single source of truth

`--nycu` and the `.bg-nycu` / `.text-nycu` utilities are deleted. There is
exactly one brand token: `--primary`. Every usage of the old utilities
migrates to Tailwind `primary` classes (`bg-primary`, `text-primary`,
`bg-primary/10`, etc.) — see #52.

## Radius

Base radius `--radius: 1rem`. The rest of the scale is a real,
shadcn-standard derivation — no step aliases another:

| Token | Formula | Value |
|---|---|---|
| `--radius-sm` | `calc(var(--radius) - 0.5rem)` | `0.5rem` |
| `--radius-md` | `calc(var(--radius) - 0.25rem)` | `0.75rem` |
| `--radius-lg` | `var(--radius)` | `1rem` |
| `--radius-xl` | `calc(var(--radius) + 0.5rem)` | `1.5rem` |
| `--radius-2xl` | `calc(var(--radius) + 1rem)` | `2rem` |

`--radius-2xl` is kept as an explicit larger step (rather than falling
back to Tailwind's stock `1rem`, which would be *smaller* than our `xl`
and invert the scale) because it's genuinely used today: floating panel
surfaces (`FloatingMenu` slash menu, expanded `TiptapMobileToolbar`),
`SettingsMenu`, the users table wrapper. `--radius-3xl` / `--radius-4xl`
are not referenced anywhere in the codebase — they're left undefined so
Tailwind's stock values apply (irrelevant, since nothing uses them).

Usage rule:

- **Controls** (buttons, inputs, selects, textareas) → `md` (`0.75rem`)
- **Cards, blocks, editor canvas, table/list container surfaces** → `lg`
  (`1rem`)
- **Hero / feature surfaces** (banners, large promotional blocks) → `xl`
  (`1.5rem`)
- **Floating panel surfaces already on `2xl`** keep `2xl` (`2rem`) —
  unchanged in this milestone
- **Capsule** (single-row floating action surfaces, avatars, status
  pills) → `rounded-full`, untouched by this scale

This replaces the old two-value system (`--radius-sm`/`-md` hardcoded to
`1rem`, `--radius-lg` through `-4xl` all aliasing `--radius: 2rem`).
Acceptance for #51: no hardcoded rem values in the `@theme` radius block
except the base `--radius` definition; `sm`/`md`/`lg`/`xl` are distinct
values; every component listed above that previously hardcoded
`rounded-[2rem]` (bypassing the token system entirely) is migrated to the
matching semantic class.

## Typography

Three font families, one job each (unchanged by this milestone, recorded
here for completeness):

- **Noto Sans TC** (`--font-noto-sans`) — every UI surface, body text,
  in-content headings. The default; never set explicitly.
- **Noto Sans Mono** (`--font-noto-sans-mono`) — `<code>`, version
  markers.
- **Instrument Serif** — decorative only (hero wordmarks, `Design
  System` title). Set inline; no Tailwind class exists for it.

Body text: `line-height: 1.7` for zh-TW copy (Chinese text needs more
vertical breathing room than Latin text at the same font size to stay
readable — this is already the project's `leading-7`/`1.75` convention
in `.prose`, formalized here as the rule rather than a per-page choice).

Heading scale (size / weight), used consistently per page type:

| Level | Class | Weight | Used for |
|---|---|---|---|
| H1 | `text-3xl` | `700` | Page titles (`/announcement/[id]`, `/events/[slug]`, article pages) |
| H2 | `text-2xl` | `600` | Major section headers within a page (`.prose h2`, dashboard section titles) |
| H3 | `text-xl` | `600` | Subsection headers, card group titles |
| H4 | `text-lg` | `600` | Card titles, list group labels |

Body copy is `text-base` (`1rem`) at `400` weight; muted/secondary copy
is `text-sm` at `400`. Don't invent a fifth heading size — if a page
needs a bigger splash than H1, that's the Instrument Serif display
treatment, not a heavier `text-3xl`.

## Spacing

Section rhythm is already correct; this milestone formalizes the
existing utilities rather than introducing new values:

| Utility | Padding | Used for |
|---|---|---|
| `.page-section-home` | `py-16` (`4rem`) | Homepage sections (`HomeCarousel`, `HomeIntroduction`, etc.) |
| `.page-section-content` | `py-12` (`3rem`) | Content pages (`/announcement`, `/introduction`, detail pages) |
| `.page-section-admin` | `py-8` (`2rem`) | Admin surfaces (`/settings`, `/carousel`, `/contacts`) |

All three share `container max-w-6xl mx-auto px-4`. No new spacing
values are introduced by this milestone — if a page needs different
rhythm, it's a `PageShell`/`PageSection` tone choice (see
`apps/web/lib/ui/patterns.ts`), not a bespoke `py-*` value.

## Imagery

- **Card covers** (result cards, announcement cards, recruitment tiles,
  event tiles): `aspect-video` (16:9), `object-cover`, enforced at every
  breakpoint — not just `md:` and up. `result-card.tsx` and
  `recruitment-card.tsx` used to fall back to a bare `h-[200px]` box on
  mobile (whatever aspect ratio the upload happened to be), which is
  exactly the "mixed aspect ratios reads as visual noise" problem #57
  describes; fixed to `aspect-video` unconditionally. Never
  `object-contain` — covers crop to fill, they don't letterbox.
- **Cover-image upload guidelines** (result covers today, the same rule
  applies wherever a card cover gets uploaded): state the aspect ratio
  and crop behavior in the upload UI itself, next to the file-type/size
  hint, not just in this doc — see `t.results.edit.coverImageGuidelines`
  in the result edit dialog. The three things every uploader needs to
  know before picking a file:
  - **Aspect ratio**: 16:9 suggested; anything else gets auto-cropped to
    fill the card (`object-cover`), not letterboxed, so off-center
    subjects can get cut.
  - **No dense screenshot-of-text covers**: slide decks, spreadsheets,
    or paragraph-dense screenshots shrink illegibly at card size and
    read as visual noise in a grid — prefer a photo, diagram, or a
    cover with a short headline, not a full slide.
  - **Safe area**: keep the subject (face, headline, logo) centered —
    the crop trims evenly from both long edges, so anything near the
    left/right border of a non-16:9 upload may not survive the crop.
  - Minimum resolution and a client-side crop tool are still open
    (tracked as follow-up, not blocking #57); for now the guidance is
    advisory copy plus the enforced `aspect-video` display.
- **Hero / carousel text overlays**: text always sits on a bottom-up
  scrim, sized to the text block only (not the full image):

  ```css
  background: linear-gradient(
    to top,
    rgb(0 0 0 / 0.6) 0%,
    rgb(0 0 0 / 0.6) 60%,
    transparent 100%
  );
  ```

  applied to a `bottom-0 h-1/2` div (i.e. the gradient's own stop
  positions are relative to that div, not the full image). The scrim
  exists purely so overlaid text clears AA contrast against an arbitrary
  photo; it is not a full-image darken.

  The middle stop matters: a plain two-stop fade
  (`rgb(0 0 0 / 0.6), transparent`) ramps opacity linearly across the
  *entire* half-height div, so by the time the ramp reaches the text
  block itself — which sits at the very bottom, inside `pb-12`/`pb-16` —
  the effective opacity is well under 0.6 and fails AA on brighter
  slides (measured 1.87:1 on the current homepage carousel before this
  fix, #55). Holding the gradient flat at `0.6` from the bottom up to the
  `60%` stop keeps the *entire* text footprint (bottom ~30% of the
  16:9 box, verified against 2-line titles + 2-line descriptions at
  desktop proportions) at the full documented opacity; the fade only
  happens in the top 40% of the div, which is pure photo — no text ever
  renders there.
- Any image-with-overlaid-text combination must be checked for AA text
  contrast against the *darkest* pixel region the scrim produces, not
  the average image brightness — and specifically against the region
  where the text actually sits, not just "the bottom of the gradient".
  Compute it: render the image at the actual display box (`object-cover`
  crop to the container's aspect ratio, not the source file's native
  aspect ratio), composite the scrim's per-row opacity in sRGB space,
  convert to WCAG relative luminance, and check the contrast ratio
  against the text color (4.5:1 body / description, 3:1 large bold
  title) — don't eyeball it or assume the average image brightness is
  representative.

## Component policy

`components/ui/` is **stock shadcn (`new-york` style) only** — every file
in that directory must be reproducible by `bunx shadcn add <name>` with
no hand edits beyond what the token system (`@theme` values in
`globals.css`) already changes automatically. Customizations,
project-specific variants, and one-off styling live in feature
components (`components/<domain>/*.tsx` outside `ui/` — see
`apps/web/CLAUDE.md` for the domain layout) or thin wrappers, never by
hand-editing a stock primitive's markup or adding bespoke classes beyond
what regenerating the primitive would produce. `ui/` is regenerable at
any time — `bunx shadcn add <name> --overwrite` should be a no-op for
every file except the documented exceptions below.

`block.tsx` and `sub-button.tsx` were never shadcn output (no upstream
`block`/`sub-button` registry item exists) and moved to the feature layer
as `components/shared/block.tsx` / `components/shared/sub-button.tsx`
(#53). The `CarouselIndicators` dot-nav component was extracted from
`components/ui/carousel.tsx` into `components/home/carousel-indicators.tsx`
for the same reason — it consumes the newly-exported `useCarousel` hook
instead of living inside the stock file. (Both since reorganized into
domain folders by #54; see `apps/web/CLAUDE.md` for the `components/`
layout.)

### Documented exceptions (#53)

A handful of `ui/` primitives keep small, intentional deltas from stock
because reverting them would either break an existing repo-wide contract
or delete real product surface. Each is a single, well-scoped edit — not
grounds to fork the whole file — and is re-checked whenever the shadcn
version is bumped:

- **`avatar.tsx`** — keeps the `xl`/`2xl`/`3xl`/`4xl` size steps stock
  dropped down to just `default`/`sm`/`lg`. They're live in production
  (`/design` gallery, `/profile/[id]`, event member grid in
  `app/[locale]/events/[slug]/client.tsx`) and the sizing lives in
  `data-[size=*]` selectors baked into the primitive's own class string,
  so there's no clean wrapper — extracting them means re-implementing the
  whole component.
- **`button.tsx`** — keeps `interactive-scale` plus the explicit
  `transition-[background-color,border-color,color,box-shadow,opacity,transform]`
  list instead of stock's `transition-all`; `transition-all` is banned
  repo-wide by `lib/ui/patterns.test.ts`. Everything else (the `radix-ui`
  import, `shadow-xs` on `outline`, the `xs`/`icon-xs` sizes) tracks
  stock.
- **`select.tsx`** — `SelectTrigger` keeps `interactive-scale` per the
  DESIGN.md rule that every clickable element that isn't already a
  `<Button>` gets it; stock doesn't ship it on any control. Everything
  else in the file (radix-ui import, `shadow-xs`/`shadow-md`, class
  ordering) tracks stock.
- **`input-otp.tsx`** — keeps `transition-colors duration-200` instead of
  stock's `transition-all`, same `patterns.test.ts` ban as `button.tsx`.
- **`card.tsx`** — keeps `rounded-lg` + `border-border` and does not add
  stock's `rounded-xl` / `shadow-sm`. Radius: cards are pinned to `lg`
  (1rem) by the Radius section above. Shadow: "Elevation & Depth" above
  is explicit that `shadow-lg` is the only elevation this app ships, and
  only on the named floating tools — cards use borders, not shadows.

## Reconciliation with `DESIGN.md`

`apps/web/DESIGN.md` is the pre-existing canonical design doc referenced
by `apps/web/CLAUDE.md`. It no longer duplicates radius/color values —
its Shapes and Colors sections, its `rounded`/`colors` frontmatter, and
`apps/web/CLAUDE.md`'s quick reminders now point here for rationale and
exact values, so there's a single place these numbers can drift from.
