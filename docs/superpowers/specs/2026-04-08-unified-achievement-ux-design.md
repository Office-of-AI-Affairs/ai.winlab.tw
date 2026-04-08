# Unified Achievement UX

> Unify the "add achievement" experience on the profile page, while keeping data models separate.

## Context

Currently there are two independent flows for adding achievements:

1. **Event Results** — created on `/events/[slug]` Results tab, stored in `results` table with `event_id`
2. **External Results** — created on `/profile/[id]`, stored in `external_results` table with `user_id`

Users need to go to two different places to manage their work. This redesign consolidates the creation entry point to the profile page.

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Data model | Keep `results` and `external_results` separate | Different data structures, different features (co-authors, draft/publish vs simple form) |
| Creation entry point | Profile page only | Single mental model — "my stuff lives on my page" |
| Event Results tab | Pure display, no create button | Events show results, don't own the creation flow |
| Event association | User selects from events they participate in | Requires `event_participants` as prerequisite |
| Profile display | Mixed grid, badge-differentiated | Unified view, time-sorted, badges for type |
| Edit routing | Event results still edit at `/events/[slug]/results/[id]/edit` | Existing edit flow works, no need to move yet |

## Prerequisite: Event Participants

A new junction table to track which users participate in which events.

### Data Model

```sql
create table public.event_participants (
  event_id uuid references public.events(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (event_id, user_id)
);
```

### RLS

- **Read**: Public (anyone can see participants)
- **Insert/Delete**: Admin only

### Event Page — Members Tab

- New tab on `/events/[slug]`: "Members" (成員)
- Only visible to logged-in users
- Displays list of participant names (from `public_profiles`)
- Each name links to `/profile/[id]`
- Admin can add/remove members (separate from this spec's scope, but the data model supports it)

## New UX Flow

### Add Achievement (Profile Page)

1. Owner sees a single "新增成果" button at top-right of the achievements grid
2. Clicking opens a dropdown/dialog with two options:
   - "活動成果" (event result) — with event icon
   - "外部成果" (external result) — with external link icon
3. **Event result path:**
   - Second step: select an event from a list of events the user participates in (query `event_participants`)
   - On select: create a draft `result` row with `event_id`, `author_id`, `status: "draft"`
   - Redirect to `/events/[slug]/results/[id]/edit`
4. **External result path:**
   - Opens the existing external result dialog form (title, description, link, image)
   - Saves directly, no draft workflow

### Profile Achievements Grid

- Merge `results` (where `author_id = user_id` OR user is co-author) and `external_results` (where `user_id = user_id`) into one array
- Sort by `created_at` descending
- Card badges:
  - Event result → badge with event name (e.g. "AI Rising Star")
  - External result → "外部" badge
  - Draft → additional "Draft" badge (owner only)
- Click behavior:
  - Event result → navigate to `/events/[slug]/results/[id]`
  - External result (owner) → open edit dialog
  - External result (visitor) → open link if exists

### Event Page Results Tab

- Remove "新增個人成果" button
- Results tab becomes read-only display of published results for that event
- All other functionality unchanged (admin pin, filtering, etc.)

## Changes Summary

### Files to Modify

| File | Change |
|------|--------|
| `app/profile/[id]/client.tsx` | Replace "新增外部成果" button with unified "新增成果" dropdown; merge results + external_results in grid |
| `hooks/use-profile-editor.ts` | Add "create event result draft" logic (select event → insert → redirect) |
| `app/events/[slug]/client.tsx` | Remove "新增個人成果" button from Results tab; add Members tab (login-gated) |
| `hooks/use-event-actions.ts` | Remove `createResult` action (no longer called from event page) |

### Files to Create

| File | Purpose |
|------|---------|
| `supabase/migrations/YYYYMMDD_create_event_participants.sql` | Junction table + RLS |
| Component for members tab (location TBD based on existing patterns) | Members list UI |

### Unchanged

- `/events/[slug]/results/[id]/edit` — edit page stays
- `/events/[slug]/results/[id]` — view page stays
- `results` table schema — no changes
- `external_results` table schema — no changes
- Co-author, team result features — no changes
- External result dialog form — no changes
