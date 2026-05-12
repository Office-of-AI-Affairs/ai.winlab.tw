# Design System Page — `/design`

A single-page living styleguide for ai.winlab.tw. Showcase-first, text-secondary. Publicly accessible, no auth required.

## Layout

- **Desktop**: Left sticky sidebar (section nav with scroll spy) + right scrollable main content
- **Mobile**: Sidebar collapses to a horizontal scroll nav pinned to top
- **Container**: `max-w-7xl` — wider than standard `max-w-6xl` because sidebar takes ~14rem, leaving the main area roughly equivalent to a full 6xl
- **No dark mode** — light only, matching the site's `defaultTheme="light"`

## Sections

### 1. Hero

- Title: "Design System"
- Tagline: one-liner describing the page purpose
- Minimal — no banner image, no background

### 2. Colors

- **Primary swatch**: `#0033a0` (NYCU blue) — large block with hex value
- **Semantic token pairs**: background/foreground, card/card-foreground, muted/muted-foreground, accent/accent-foreground, secondary/secondary-foreground, popover/popover-foreground, destructive (text: white), border, input, ring — each pair shown as bg swatch with foreground text on top + CSS variable names
- **Chart tokens**: chart-1 through chart-5 as a color strip
- Layout: responsive grid, ~4 columns desktop, 2 columns mobile

### 3. Typography

- **Font families**: Noto Sans (UI), Noto Sans Mono (code) — each rendered as a specimen line with the font name. Instrument Serif (decorative) is mentioned in CLAUDE.md but not yet loaded in the codebase — add it to `app/layout.tsx` as a prerequisite, then include in the specimen
- **Heading scale**: h1 through h4 rendered live using the site's prose styles
- **Body text**: paragraph, small, code inline — showing actual sizes
- **Weight scale**: regular (400) / medium (500) / semibold (600) / bold (700) / extrabold (800) in a horizontal strip

### 4. Spacing & Radius

- **Radius visual**: side-by-side boxes showing `1rem` (inner elements: buttons, inputs) vs `2rem` (outer containers: cards, blocks)
- **PageShell tones**: all 8 tones explicitly — content, contentLoose, dashboard, admin, editor, centeredState, auth, profile — each with their padding/gap values displayed

### 5. Components

Each component gets a subsection with a heading and all variants rendered in a grid or row. Minimal text — just the component name and variant labels.

| Component | What to show |
|-----------|-------------|
| **Button** | 6 variants (default, destructive, outline, secondary, ghost, link) × 3 sizes (sm, default, lg) + 3 icon sizes (icon-sm, icon, icon-lg) + disabled state |
| **Badge** | 6 variants (default, secondary, destructive, outline, ghost, link) in a row |
| **Card** | Basic card + full card with Header, Title, Description, Content, Action, Footer |
| **Block** | 3 variants (default, outline, ghost) × 4 sizes (sm, default, lg, auto) |
| **Input** | default, with placeholder, disabled, with label |
| **Textarea** | default, disabled |
| **Select** | default, disabled (using shadcn Select component) |
| **Checkbox** | checked, unchecked, disabled, with label |
| **Dialog** | trigger button that opens a demo dialog with title, description, content, close |
| **Alert Dialog** | trigger button that opens a destructive confirmation dialog |
| **Dropdown Menu** | trigger button that opens a menu with items, separator, sub-menu |
| **Popover** | trigger button with popover content |
| **Avatar** | with image, with fallback initials, different sizes if available |
| **Table** | simple 3-column demo table with header and a few rows |
| **Separator** | horizontal and vertical |
| **Skeleton** | text lines, card skeleton, avatar skeleton |
| **SubButton** | link-style and onClick-style |
| **Label** | standalone + paired with Input/Checkbox |
| **Collapsible** | open/closed states |

### 6. Patterns

- **interactive-scale**: demo element showing hover scale-up and active scale-down
- **nav-bracket**: `[ link ]` hover effect — live links showing the bracket animation
- **Empty states**: the standard `尚無{entity}` pattern rendered centered
- **Status badges**: "已發布" (Badge default) vs "草稿" (Badge secondary) side by side
- **Toast triggers**: buttons that fire success / error / info toasts via sonner
- **AppLink**: the project's unified link component — internal vs external link behavior demo

## Sidebar Navigation

- Each section is an anchor target (`id="colors"`, `id="typography"`, etc.)
- Sidebar lists all section names as links
- **Scroll spy**: uses `IntersectionObserver` to highlight the current section in the sidebar
- Desktop: sticky `top-20` (below header), `w-56`
- Mobile: horizontal scrollable bar, `sticky top-16`, `z-10`, thin with small text

## Technical Decisions

- **No new dependencies** — scroll spy via native `IntersectionObserver`, no library needed
- **Server Component for layout**, Client Component for scroll spy sidebar and interactive demos (dialog triggers, toast triggers, etc.)
- **Page structure**: `app/design/page.tsx` (server) renders static sections + imports `DesignSidebar` (client) and interactive demo wrappers (client)
- **No auth** — publicly accessible page, no `requireAdminServer()`
- **Components rendered directly** — import the actual `Button`, `Badge`, etc. from `components/ui/` so the showcase always reflects the real components

## File Plan

| File | Type | Purpose |
|------|------|---------|
| `app/design/page.tsx` | Server Component | Main page, renders all sections |
| `app/design/sidebar.tsx` | Client Component | Sticky sidebar with scroll spy |
| `app/design/interactive.tsx` | Client Component | Dialog, AlertDialog, Dropdown, Popover, Toast trigger wrappers |

## Out of Scope

- Dark mode display/toggle
- Props playground / interactive prop editing
- Sub-routes (everything lives on one page)
- Code snippets / copy-paste blocks (this is a visual showcase, not a docs site)
