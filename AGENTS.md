# AGENTS.md

This file is the single source of truth for coding agents working in this repository. Keep agent-facing instructions here. `CLAUDE.md` only exists as a compatibility pointer to this file.

## Project overview

- Stack: Next.js 16 App Router, Supabase, Tailwind CSS v4, shadcn/ui
- Package manager: use `bun` only
- Rich text content is stored as Tiptap JSON

## Setup commands

- Start dev server: `bun dev`
- Create production build: `bun build`
- Start production server: `bun start`
- Run lint: `bun lint`
- Add shadcn/ui components: `bunx shadcn add <name>`

## Environment variables

`.env.local` must include:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=
```

## Architecture

- Root app uses Next.js App Router with Supabase for DB, Auth, and Storage.
- `app/layout.tsx` runs as a Server Component and loads pinned events from the `events` table to pass into `<Header pinnedEvents={...} />`.
- `AuthProvider` in `components/auth-provider.tsx` wraps the app and exposes `useAuth()` with `user`, `profile`, `isAdmin`, `isLoading`, `signIn`, and `signOut`.
- `NuqsAdapter` is already wired in the root layout for URL search param state.

## Auth and Supabase rules

### Client selection

- Client Components: `@/lib/supabase/client`
- Server Components and Route Handlers: `@/lib/supabase/server`
- `proxy.ts` or middleware-style code: `@/lib/supabase/proxy`

### Access model

- Unauthenticated users can only see records with `status: published`.
- Authenticated non-admin users can see their own drafts and all published content.
- Admin users have full read/write access when `profile.role === "admin"`.
- Vendor users (`profile.role === "vendor"`) can create/edit/delete recruitment entries only under events they are assigned to (`event_vendors`) and only for listings they created (`created_by = auth.uid()`).
- `isEventVendor()` in `lib/supabase/check-event-vendor.ts` checks vendor-event assignment server-side.
- In Server Components, query the `profiles` table directly when you need admin state.

## Data model

Core entities defined in `lib/supabase/types.ts`:

- `Announcement`: announcement content, Tiptap JSON, `status: draft | published`, optional `event_id`
- `Result`: event or competition result, `type: personal | team`, `pinned`, optional `event_id`
- `Recruitment`: stored in DB table `competitions`, includes `positions`, `application_method`, and `contact` JSON fields; `created_by` tracks the author
- `EventVendor`: junction table (`event_vendors`) linking vendor users to events they can manage
- `RecruitmentInterest`: tracks user interest in recruitment listings (`recruitment_interests`); one per user per competition
- `Event`: `slug`, `status: draft | published`, `pinned`, `sort_order`
- `Introduction`: single office-introduction record with Tiptap JSON content
- `OrganizationMember`: `category: core | legal_entity | industry`
- `Profile`: extends `auth.users`, includes `role`, profile fields, social links, and resume data
- `ExternalResult`: user-submitted external result links
- `Tag` and `ResultTag`: hierarchical result tagging
- `Team`, `TeamMember`, `TeamInvitation`: team management
- `CarouselSlide`, `Contact`: homepage carousel and contact info

Conventions:

- `event_id IS NULL` means global content (applies to Announcement only).
- `event_id IS NOT NULL` means content belongs to a specific event.
- Recruitment entries are always event-scoped; there is no global recruitment page.
- Results have no global listing page; all result detail pages are under `/events/[slug]/results/[id]`.

## Database and storage

- SQL migrations live in `supabase/migrations/` and should be applied in order through the Supabase SQL editor.
- All tables use RLS.
- Initial setup also requires the public storage bucket `announcement-images`.
- Storage policies are defined in `supabase/storage-policies.sql`.

## Shared hooks and editor rules

- All editing pages should use `hooks/use-auto-save.ts`.
- `useAutoSave` debounces saves by default and provides `guardNavigation` to prevent leaving with unsaved changes.
- `components/tiptap-editor.tsx` is the shared rich text editor for `Announcement`, `Result`, `Introduction`, and similar content fields.
- Editor image upload uses `uploadAnnouncementImage`.

## Page structure

### Homepage

- `/` is composed from Server Components that fetch independently: `HomeCarousel`, `HomeIntroduction`, `HomeOrganization`, `HomeAnnouncement`, `HomeEvents`, `HomeContacts`

### Events

- `/events`: event list
- `/events/[slug]`: event detail page with announcements, results, and recruitment tabs
- `/events/[slug]/edit`: admin event metadata editing
- `/events/[slug]/announcements/[id]` and `/edit`
- `/events/[slug]/results/[id]` and `/edit`
- `/events/[slug]/recruitment/[id]/page.tsx`: public view with role-based interest UI; vendor/admin can see applicant list

### Content management

- `/announcement`, `/announcement/[id]`, `/announcement/[id]/edit`
- `/introduction`, `/introduction/edit`
- `/organization`, `/organization/[id]/edit`
- `/carousel/[id]/edit`, `/contacts/[id]/edit`
- Note: there are no global `/result` or `/recruitment` listing pages — all results and recruitment entries are event-scoped

### Account and public profile pages

- `/account`: profile, teams, invitations
- `/account/teams`, `/account/teams/[id]`
- `/profile/[id]`: public author page; vendor users see a "My Events" section showing assigned events

### Admin-only pages

- `/settings`: user management

## UI conventions

### Radius system

Defined in `app/globals.css`:

- `rounded-sm` and `rounded-md` map to `1rem` for inner controls and smaller surfaces
- `rounded-lg` and above map to `2rem` for outer containers such as cards, dialogs, and buttons
- `rounded-full` is reserved for circular elements
- `--radius` is `2rem`
- Inner controls should keep `rounded-md`; do not promote them to `rounded-lg` or larger
- Buttons default to `rounded-lg`

### Motion and interaction rules

- Use `duration-200` for interactive transitions. Do not introduce `duration-150`, `duration-300`, `duration-500`, or other exceptions for standard UI interactions.
- Every clickable UI element should expose the shared hover and active feedback pattern: `hover:scale-[1.02]` and `active:scale-[0.98]`.
- Reuse the shared `.interactive-scale` utility or high-level wrappers built on it instead of hand-writing motion classes repeatedly.
- Prefer Tailwind animation utilities for UI animation behavior.
- Prefer managed focus with refs/effects over raw `autoFocus` in application components unless the focus jump is both intentional and documented.

### Page layout spacing

- Homepage sections use the shared `home` spacing tier: `py-16`.
- Standard content pages use the shared `content` spacing tier: `py-12`.
- Admin and edit pages use the shared `admin` spacing tier: `py-8`.
- Reuse `PageSection` instead of re-declaring page container spacing ad hoc.
- Route-level pages and loading states should use the shared `PageShell` variants instead of hand-writing wrapper containers repeatedly.
- Pick the `PageShell` variant that matches the route type, for example `content`, `contentLoose`, `dashboard`, `admin`, `editor`, `centeredState`, `auth`, or `profile`.
- The page and its matching `loading.tsx` should use the same shell variant unless there is a deliberate, documented reason not to.

### Links

- Do not render raw `<a>` tags for app links.
- Use the project-level `AppLink` wrapper for internal routes, external URLs, `mailto:`, and `tel:` links so link behavior stays consistent.

### Skeletons and loading states

- Use shadcn/ui `Skeleton` as the base loading primitive.
- High-level UI components should own their matching skeleton components, for example `EventCard` with `EventCardSkeleton` and `Block` with `BlockSkeleton`.
- Skeleton components should mirror the final component's layout, spacing, aspect ratio, and visual rhythm as closely as possible.
- Route-level loading files should compose layout with component-owned skeletons, and should not handcraft content skeletons that duplicate component internals.
- Route-level loading wrappers should mirror the real page wrapper exactly, including `max-width`, padding, and gap values. Do not substitute a generic container if the actual page uses a different layout shell.
- Avoid page-owned skeleton abstractions that compete with component-owned skeletons.

### Rich text editor interaction

- Desktop Tiptap editing should use contextual controls instead of a persistent full toolbar.
- Desktop inline formatting should use `BubbleMenu`.
- Desktop block insertion should use `FloatingMenu`, including `/`-triggered insertion near the current cursor block when appropriate.
- Mobile Tiptap editing should use a dedicated compact toolbar instead of desktop-style floating controls.
- Mobile block insertion should stay behind an explicit `+` entry instead of copying the desktop floating interaction.
- The editor canvas should stay visually close to read mode so editing and reading share the same document feel.
- Prefer the editor canvas as the primary writing surface; do not reintroduce preview-first editing flows unless there is a route-specific product reason.

### Color tokens

- Do not hardcode grayscale UI colors such as `text-gray-*`, `border-gray-*`, or `bg-white` in feature components.
- Use semantic tokens like `text-foreground`, `text-muted-foreground`, `border-border`, `bg-background`, and `bg-card`.

### UI stack

- `components/ui/` contains shadcn/ui primitives
- Tailwind CSS v4 configuration lives in `app/globals.css`; do not introduce `tailwind.config.js` unless the project architecture changes
- `next-themes` is configured in the root layout with `defaultTheme="light"`

### Typography

- `--font-noto-sans`: primary UI font, mapped to `--font-sans`
- `--font-noto-sans-mono`: code font, mapped to `--font-mono`
- `--font-instrument-serif`: decorative heading font, must be applied with inline style rather than a Tailwind class

### Components and images

- `components/ui/card.tsx` is a plain `div` Server Component with the project card treatment
- `data-slot` attributes are used for parent-child CSS selectors
- Use `next/image` for images
- Supabase remote patterns already allow `*.supabase.co`
- Storage path conventions:
  - Announcement inline images: root
  - Recruitment covers: `competitions/`
  - Result header images: `results/`
  - Organization member photos: `organization/`
  - Event covers: `events/`

## Maintenance note

- When agent instructions need updates, edit this file instead of `CLAUDE.md`.
- Keep `AGENTS.md` and `rules/*.md` in sync when repository guidance changes.
- The remote branch should carry the latest committed versions of both `AGENTS.md` and `rules/*.md`.
- The sibling MCP repo lives at `~/mcp.ai.winlab.tw` and powers the `mcp.ai.winlab.tw` tool surface. After changing app-facing schemas, content models, RLS, or admin workflows here, always check whether that repo's MCP tools and shared Supabase types need matching updates.

## Delivery workflow

- Treat each completed implementation topic as its own unit of work and create a git commit as soon as the relevant code, tests, and docs for that topic are verified.
- Do not pause to ask for permission before making a topic-scoped commit once verification is complete.
- Before proposing a push, run the relevant local verification commands for the current topic.
- When the overall requested goal is finished, stop and ask the user to confirm before pushing anything upstream.
- Do not push on the user's behalf until they explicitly confirm that the final state is ready.
