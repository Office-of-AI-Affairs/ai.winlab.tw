---
version: alpha
name: ai.winlab.tw Design System
description: >
  國立陽明交通大學人工智慧專責辦公室網站的設計基礎。
  Content-first、視覺低調、view 與 edit 在多數頁面共用同一條路由。
  Single source of truth alongside `app/globals.css` (tokens),
  `lib/ui/patterns.ts` (layout shells), and `/design` (live gallery).
colors:
  background: "#FFFFFF"
  foreground: "#252525"
  card: "#FFFFFF"
  cardForeground: "#252525"
  popover: "#FFFFFF"
  popoverForeground: "#252525"
  primary: "#0033A0"
  primaryForeground: "#FFFFFF"
  secondary: "#F5F5F5"
  secondaryForeground: "#343434"
  muted: "#F5F5F5"
  mutedForeground: "#737373"
  accent: "#F5F5F5"
  accentForeground: "#343434"
  destructive: "#D63E1F"
  border: "#E8E8E8"
  input: "#E8E8E8"
  ring: "#B5B5B5"
typography:
  display:
    fontFamily: "Instrument Serif"
    fontSize: 3rem
    fontWeight: 400
    lineHeight: 1.1
  heading1:
    fontFamily: "Noto Sans"
    fontSize: 2.25rem
    fontWeight: 800
    lineHeight: 1.2
  heading2:
    fontFamily: "Noto Sans"
    fontSize: 1.875rem
    fontWeight: 600
    lineHeight: 1.3
  heading3:
    fontFamily: "Noto Sans"
    fontSize: 1.5rem
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "Noto Sans"
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.75
  bodyMuted:
    fontFamily: "Noto Sans"
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.5
  code:
    fontFamily: "Noto Sans Mono"
    fontSize: 0.875rem
    fontWeight: 500
rounded:
  inner: 1rem      # rounded-sm / rounded-md (table cells, badges, small chips)
  outer: 2rem      # rounded-lg through rounded-4xl all alias --radius
  full: 9999px     # capsule (single-row floating action surfaces)
spacing:
  pageHome: 4rem      # py-16
  pageContent: 3rem   # py-12
  pageAdmin: 2rem     # py-8
  floaterInset: 1rem  # bottom-4 / right-4 (mobile floating tools)
  floaterInsetDesktop: 1.5rem  # bottom-6 / right-6 (md and up)
components:
  button:
    rounded: "{rounded.outer}"
    height: 2.25rem
    padding: "0 1rem"
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primaryForeground}"
  buttonHover:
    backgroundColor: "{colors.primary}"
    transform: "scale(1.02)"
  buttonActive:
    transform: "scale(0.98)"
  buttonGhost:
    backgroundColor: transparent
    textColor: "{colors.foreground}"
  card:
    rounded: "{rounded.outer}"
    backgroundColor: "{colors.card}"
    textColor: "{colors.cardForeground}"
  badge:
    rounded: "{rounded.full}"
    height: 1.25rem
    padding: "0 0.625rem"
    typography: "{typography.bodyMuted}"
  badgePublished:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primaryForeground}"
  badgeDraft:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.secondaryForeground}"
  pillFloater:
    rounded: "{rounded.full}"
    height: 2.5rem
    padding: "0 1rem"
    backgroundColor: "{colors.background}"
    border: "{colors.border}"
    shadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)"
    backdropFilter: blur(4px)
  panelFloater:
    rounded: "{rounded.outer}"
    padding: 0.5rem
    backgroundColor: "{colors.background}"
    border: "{colors.border}"
    shadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)"
    backdropFilter: blur(4px)
  input:
    rounded: "{rounded.inner}"
    height: 2.25rem
    padding: "0 0.75rem"
    border: "{colors.input}"
    backgroundColor: "{colors.background}"
  bodyText:
    typography: "{typography.body}"
    textColor: "{colors.foreground}"
  mutedText:
    typography: "{typography.bodyMuted}"
    textColor: "{colors.mutedForeground}"
---

# ai.winlab.tw Design System

This file is the canonical written spec. Two companions:

- **`app/globals.css`** — runtime tokens (CSS custom properties, OKLCH colors, layer utilities). The frontmatter above mirrors these as hex.
- **`/design`** — live gallery. Every component listed here renders there; if the gallery and this file disagree, the gallery is broken — fix the code, not the doc.

The frontmatter is for AI agents that want machine-readable tokens; the body below is for humans (and agents) deciding *when* to use what.

## Overview

NYCU Royal Blue (`#0033A0`) on near-white, soft greys for chrome, OKLCH for everything except brand. Tone is content-first and quiet: most surfaces are flat, shadows are reserved for floating tools, type does the heavy lifting. Personality is academic and a little playful — the Instrument Serif `Design System` and `WinLab` wordmarks are the only places we let typography breathe.

The hardest design call this site repeatedly makes: **admin and visitor see the same layout on the same URL**. Edit affordances appear as *floating* additions, never as toolbars that push content down or panels that frame the canvas. Privacy (`/privacy`) is the canonical example. When you're tempted to add admin chrome that visitors don't see, find a way to put it in a pill or dialog instead.

## Colors

All colors come from CSS custom properties in `app/globals.css`. Use **semantic tokens** (`bg-primary`, `text-muted-foreground`, `border-border`) — never hardcode `gray-*`, `slate-*`, or hex literals in component code.

| Token | Used for |
|---|---|
| `primary` / `primaryForeground` | NYCU brand: primary buttons, active nav state, link underlines |
| `background` / `foreground` | Page surfaces and main type |
| `card` / `cardForeground` | Slightly elevated surfaces in admin tables and rows; today identical to background but kept separate so dark mode can diverge |
| `muted` / `mutedForeground` | Secondary text, table header strips, subtle hover backgrounds |
| `secondary` / `secondaryForeground` | "Draft" badge, secondary buttons |
| `border` / `input` | All hairlines, table dividers, input outlines |
| `destructive` | Delete buttons, error states, "刪除失敗" toasts |
| `ring` | Keyboard focus ring (`focus-visible:ring-ring`) |

The brand color `#0033A0` is the only non-OKLCH value — university brand sheet locks the hex. Everything else is OKLCH so light/dark variants stay perceptually consistent.

`primary/10`, `primary/20`, `background/95` etc. (Tailwind opacity-suffix syntax) are how we get translucent variants — used for subtle accent fills (`bg-primary/10`) and floating surface glass (`bg-background/95 backdrop-blur-sm`).

## Typography

Three families, each with one job:

- **Noto Sans (`--font-noto-sans`)** — every UI surface, body text, headings inside content. The default; never set explicitly.
- **Noto Sans Mono (`--font-noto-sans-mono`)** — `<code>` and version markers (`v3` in version history).
- **Instrument Serif (`--font-instrument-serif`)** — decorative only. Hero wordmarks, the Design System title. Must be set inline (`style={{ fontFamily: "var(--font-instrument-serif)" }}`) because Tailwind doesn't get a class for it.

Prose styling for rich text (announcement, intro, privacy article body) is centralized in `lib/ui/rich-text-classes.ts` and applied via `richTextDocumentClassName` (read mode) or — when an inline editor is *flush* with the read layout — the same class via the editor's `flush` prop. The `prose` plugin's heading scale, lists, blockquote, hr, code, and link styles are pinned in `app/globals.css`'s `.prose { ... }` block; that's the contract every Tiptap-rendered article page agrees on.

Don't add new prose styling at the page level. If you need a new article element style, edit the central `.prose` block.

## Layout

Pages share two primitives, both in `lib/ui/patterns.ts`:

**`<PageShell tone="...">`** — outer container. Six tones, each with a fixed max-width, padding, and gap rhythm:

| Tone | Class | Used for |
|---|---|---|
| `content` (default) | `max-w-6xl mx-auto px-4 py-12 flex flex-col gap-8` | `/announcement`, `/introduction`, `/privacy`, detail pages |
| `dashboard` | `max-w-6xl mx-auto p-4 flex flex-col gap-4` | `/account` summary surfaces |
| `admin` | `max-w-6xl mx-auto px-4 py-8 flex flex-col gap-8` | `/settings`, `/settings/users`, `/carousel`, `/contacts` |
| `editor` | `max-w-6xl mx-auto px-4 flex flex-col mt-8 pb-16` | `/announcement/[id]/edit`, `/events/[slug]/edit`, the dedicated `/edit` routes |
| `auth` | `min-h-[calc(100vh-10rem)] flex items-center justify-center px-4 py-12 md:py-16` | `/login`, `/forgot-password`, `/reset-password` |
| `profile` | `max-w-6xl w-full` | profile page, layout has its own padding |

**`<PageSection tone="...">`** — within-page bands; three tones (`home`, `content`, `admin`) backed by `.page-section-*` utility classes in globals.css.

The `max-w-6xl` (1152px) ceiling is universal — content never grows past that on any breakpoint. Mobile uses `px-4` (16px gutter), desktop reads the same width with no further padding past `mx-auto`.

## Elevation & Depth

Shadows are scarce by design.

- **`shadow-lg`** is the only elevation level we ship, and only on **floating tools** (BubbleMenu, FloatingMenu, MobileToolbar, EditModeToggle, EditActionsPill, Dialog overlays).
- Cards, panels, and table rows use **borders, not shadows**, to imply hierarchy.
- Backgrounds use `bg-background/95 backdrop-blur-sm` to read as glass when stacked over content.

**Z-stack**:

| Layer | `z-` | What |
|---|---|---|
| Floating tools | `z-30` | BubbleMenu, MobileToolbar, EditModeToggle, EditActionsPill |
| Sticky regional headers | `z-20` | Sticky in-page tab navs (`/design` mobile sub-nav uses `z-10`) |
| Mobile sub-nav | `z-10` | `/design` sub-nav |
| Modal overlays | radix-managed | Dialog, AlertDialog, Popover (handled by primitive, don't override) |

Outline focus uses `ring-ring focus-visible:ring-2 ring-offset-1` — never `outline-none` without a replacement ring.

## Shapes

Two radius tiers, plus capsule:

| Token | Tailwind alias | Used for |
|---|---|---|
| `inner` (1rem) | `rounded-sm`, `rounded-md` | Inputs, table cells, badges, internal pills (e.g. role chip in users table) |
| `outer` (2rem) | `rounded-lg`, `rounded-xl`, `rounded-2xl`, `rounded-3xl`, `rounded-4xl` (all alias `--radius`) | Cards, blocks, dialogs, panel-shaped floating tools, dropdown panels |
| `full` (9999px) | `rounded-full` | Capsule: single-row floating action surfaces, status pills, avatars |

The `--radius: 2rem` setup in `app/globals.css` aliases every `rounded-lg+` step to the same value — pick whichever variant reads best in the JSX, the rendered result is the same. Don't introduce new radius values.

## Components

The live gallery at **`/design`** renders one specimen of every primitive listed below. Treat it as a smoke test: if a primitive isn't there, it isn't part of the system yet.

### Buttons

`<Button>` (`components/ui/button.tsx`) variants: `default` (primary), `secondary`, `destructive`, `outline`, `ghost`, plus `size="icon"` and `disabled`. All buttons inherit `interactive-scale` (hover `scale-1.02`, active `scale-0.98`) and `transition-[bg,border,color,shadow,opacity,transform]`. Don't apply `transition-all` anywhere — a contract test (`lib/ui/patterns.test.ts`) catches it.

`<SubButton>` (`components/ui/sub-button.tsx`) — secondary affordance that renders as an `<a>` (link mode) or `<button>` (action mode). Used for "back" links, lightweight CTAs that shouldn't compete with primary buttons.

### Badges

`<Badge>` (`components/ui/badge.tsx`) variants: `default`, `secondary`, `outline`. **Status convention**:

- `variant="default"` → 已發布 (published)
- `variant="secondary"` → 草稿 (draft)
- Custom colors only via `bg-*/10 text-*` opacity fills, never solid arbitrary colors

### Cards & Blocks

- `<Card>` — main content slab. Subcomponents: `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`. Server-renderable (it's a plain `<div>`).
- `<Block>` — heavier muted/outline/ghost surface, sized `sm`/`default`/`lg`/`auto`. Used for empty-state callouts and large emphasis sections (e.g. `/account` blocks).

### Form

- `<Input>`, `<Textarea>`, `<Label>`, `<Select>`, `<Checkbox>` — all shadcn defaults, all use `border-input` + `rounded-sm`. Always pair inputs with `<Label>`; never rely on `placeholder` as the only label (an a11y contract test enforces this on profile edit / users table).

### Overlays

- `<Dialog>` — neutral modal. Use for: confirmations with optional content, multi-field forms (recruitment dialog, organization member dialog).
- `<AlertDialog>` — destructive confirmations. Always pair `AlertDialogAction variant="destructive"` with a clear `AlertDialogCancel`.
- `<Popover>` — anchored inline overlay (tag picker in users table, owner picker for recruitment).

#### Container hierarchy: don't nest cards

The dialog itself is the card. **Don't wrap inner content in another bordered surface** (`rounded-xl border` around a list, `<Card>` inside a `<DialogContent>`, etc.) — that's a card inside a card and reads as overcomplicated chrome. Group inner content via:

- `divide-y` on lists for row separators (no outer border)
- a single `<Separator />` between two distinct semantic groups
- whitespace and a small section heading (`text-sm font-semibold`)

Same rule for `<Popover>`, `<EditActionsPill>` body, and `<Card>` interiors — the outer container provides the visual frame, inside is flat.

#### Buttons in overlays — every action has a visible boundary

When a Dialog has a primary + secondary action, both buttons need an outline. Use `variant="default"` for primary, `variant="outline"` for secondary. **Don't use `variant="ghost"` for a real action** — it looks unclickable next to a filled button. `ghost` is fine for tertiary back-links and icon buttons, not for "Cancel" / "Exit" sitting beside "Publish".

#### Form fields in overlays — label + placeholder is the default

Pair an `<Input>` with `<Label>` and a placeholder. Skip the helper-text paragraph below by default — the placeholder describes the field, the action button below describes what happens on submit. Only add helper text when it conveys a hidden constraint the user otherwise can't see (format requirements, character limits, irreversible side effects).

### Avatar

`<Avatar>` with `size="default" | "sm" | "lg" | "xl"`. `AvatarImage` falls back to `AvatarFallback` (initials) when `src` fails. Used in members grid, profile header, header user menu.

### Table

shadcn `<Table>` family. Header row uses `bg-muted/40`, body rows hover-highlight with `hover:bg-muted/30`. Column header buttons sort via TanStack Table when needed (see `users-table.tsx`).

### Skeleton

`<Skeleton>` for loading placeholders. **Rule: high-level UI components own their matching skeleton component**, route-level `loading.tsx` composes the layout with those skeletons (`SettingsMenuSkeleton`, `UsersTableSkeleton`). Don't draft loading.tsx with raw `Skeleton` shapes if a component-owned variant already exists.

### Floating surfaces

Two families, identical glass treatment (`border border-border bg-background/95 shadow-lg backdrop-blur-sm`), different shapes:

**Action capsule** — `rounded-full`, `h-10`, single-row content:

- `BubbleMenu` (Tiptap selection-bound formatting) — `components/tiptap-desktop-bubble-menu.tsx`
- `FloatingMenu` block (Tiptap empty-line affordances, non-slash mode) — `components/tiptap-desktop-floating-menu.tsx`
- `TiptapMobileToolbar` (closed state) — `components/tiptap-mobile-toolbar.tsx`
- `EditModeToggle` (admin "編輯" pill in view mode) — `components/edit-mode-toggle.tsx`
- `EditActionsPill` (status pill + dialog trigger in edit mode) — `components/edit-actions-pill.tsx`

**Panel** — `rounded-2xl`, padded, multi-row content:

- `FloatingMenu` slash dropdown (Tiptap `/`-triggered insertion menu)
- `TiptapMobileToolbar` expanded state (when "+" is open)
- All `Dialog`, `AlertDialog`, `Popover` content surfaces

Capsule on a multi-row container warps into an oval — use the panel shape there.

**Position contract for floating action surfaces**: all bottom-anchored ones share the same coordinates so they never visually fight each other.

| Surface | Bottom (mobile) | Bottom (desktop) | Side |
|---|---|---|---|
| `EditModeToggle` | `bottom-4` | `bottom-6` | `right-4` / `right-6` |
| `EditActionsPill` | `bottom-4` | `bottom-6` | `right-4` / `right-6` |
| `TiptapMobileToolbar` (mobile only) | `bottom-4` | n/a (`md:hidden`) | `left-4` |

### Tiptap editor

`<TiptapEditor>` (`components/tiptap-editor.tsx`) is the single rich-text editor. Two modes:

- **Default (padded canvas)** — `editableRichTextDocumentClassName` adds `min-h-[360px] py-6 sm:py-8`, the canvas wraps in `rounded-[2rem] bg-background`. Used by every dedicated `/edit` page.
- **`flush={true}`** — drops the internal padding, min-height, and rounded canvas frame. `RichTextSurface` opts in for inline-edit pages where view and edit must pixel-align (only `/privacy` today; same pattern will apply to other inline-edit migrations).

`<RichTextSurface>` (`components/rich-text-surface.tsx`) is the unified shell that renders server HTML in view mode and dynamically loads `TiptapEditor` (`flush`) in edit mode. View visitors never download Tiptap; admins do, only when `useEditMode` flips to `edit`.

### Edit mode primitives

- `useEditMode(opts)` (`hooks/use-edit-mode.ts`) — `?mode=view|edit` URL state via nuqs, ⌘E toggle, auto-clears the param when the viewer can't edit.
- `<EditModeToggle>` — view-mode floating "編輯" pill.
- `<EditActionsPill>` — edit-mode status pill that opens a Dialog. The Dialog body is page-specific; pass any actions, hidden attributes, change-history surface as children.

This trio is the inline view+edit template. Other rich-text pages (announcement, introduction, event detail) will adopt it next.

### Links

- `<AppLink>` (`components/app-link.tsx`) is the only link primitive. Internal links render as `<Link>`; external links auto-detect (`getAutoLinkProps` in `lib/ui/patterns.ts`) and add `target="_blank" rel="noopener noreferrer"`.
- Never use raw `<a>` tags. Contract tests will eventually grow to enforce this.

### Toast

`sonner` via `<Toaster>`. Three flavors: `toast.success`, `toast.error`, `toast.info` (and `toast.message` for neutral notes). Always emit `toast.error` on a failed CRUD mutation — it's part of the hooks contract in `CLAUDE.md`.

### Page-level patterns

- `.interactive-scale` (defined in globals.css) — adds the standard hover/active scale + the `disabled:hover:scale-100` reset. Apply to anything clickable that should feel "alive".
- `.interactive-opacity` — opacity-only transition, for non-interactive emphasis fades.
- `.nav-bracket` — header nav decoration: `[`/`]` brackets fade in on hover and stay visible when `.nav-bracket-active`. Used only in `<Header>`.
- **Empty state copy**: `尚無{entity}` (e.g. `尚無公告`, `尚無版本紀錄`), centered, `text-muted-foreground`. Don't invent new empty-state phrasings.

## Do's and Don'ts

**Do**

- Reuse semantic tokens. Read `app/globals.css` first; if the value isn't there, you're probably about to invent something off-system.
- Apply `interactive-scale` for any clickable element that isn't already a `<Button>` (which inherits it).
- For ISR + admin pages, keep editor logic inside the client.tsx and import server actions for cache invalidation. View visitors must never download Tiptap.
- For inline-edit pages, default to: server HTML in view → `RichTextSurface` swaps in `TiptapEditor flush` for admin → floating pill / dialog for actions.
- When in doubt about a spacing or shape choice, render it next to a matching primitive on `/design` and see if the eye disagrees.

**Don't**

- Don't hardcode `gray-*`, `slate-*`, or hex colors. Tokens or nothing.
- Don't use `transition-all` (a patterns test bans it). Use `transition-colors`, `transition-transform`, or `transition-[<list>]`.
- Don't add `transition-transform` separately from `interactive-scale` — that utility already includes the transition.
- Don't introduce new radius values. `rounded-sm/md` (1rem) and `rounded-lg+` (2rem) cover everything; capsule is `rounded-full`.
- Don't push admin chrome into the read flow. If admin needs to manage something, use a floating pill + dialog (see `/privacy`). Toolbars that push content down break the inline-edit philosophy.
- Don't nest cards. The Dialog / Popover / EditActionsPill / Card itself is the card — inside, use `divide-y`, `<Separator />`, or whitespace to group. No `rounded-xl border` around a list within a Dialog.
- Don't use `variant="ghost"` for a real action sitting next to a filled button — it reads as unclickable. Pair primary (`default`) with secondary (`outline`).
- Don't add helper text under a form field by default. Label + placeholder is enough; only add helper text when it conveys a hidden constraint (format, limit, side effect).
- Don't draft your own loading skeleton if a component-owned skeleton already exists.
- Don't use raw `<a>`. Use `<AppLink>`.
- Don't expand the lowlight language registry without need — every language pack adds to the editor bundle (`lib/ui/lowlight.ts` lists what's currently registered).
- Don't surface raw `placeholder` as the only label on form inputs — pair with `<Label>` or `aria-label`.

## Provenance

- Format inspired by [Google Labs DESIGN.md spec](https://github.com/google-labs-code/design.md) (March 2026).
- Companion files: `app/globals.css` (runtime tokens), `lib/ui/patterns.ts` (layout shells), `lib/ui/rich-text-classes.ts` (prose contract), `app/design/page.tsx` (live gallery).
- Component contract tests: `lib/ui/patterns.test.ts`, `lib/ui/render-contracts.test.tsx`, `lib/ui/accessibility-contracts.test.ts`.
