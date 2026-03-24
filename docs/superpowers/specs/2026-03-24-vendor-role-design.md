# Vendor Role Feature Design

## Overview

Add a "vendor" role that allows companies/organizations to manage their own recruitment listings under specific events. Vendors are assigned to events by admins and can publish, edit, and manage recruitment entries. Logged-in users can express interest in recruitment listings, creating a lightweight application flow backed by their profile and resume.

## Requirements

1. Admin can assign the `vendor` role to any user via settings/users and bind them to one or more events.
2. Vendors can create, edit, and delete recruitment entries **only** under their assigned events.
3. Vendors can only edit/delete recruitment entries they created (`created_by`).
4. Logged-in users can express interest in a recruitment listing (toggle). Their profile and resume are shared with the vendor.
5. Vendors (and admins) can see the full list of interested users with links to their profiles.
6. Other logged-in users see only the interest count. Unauthenticated users see basic recruitment info only.

## Data Model

### Modified tables

**`profiles.role`** — extend the check constraint:

```sql
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check,
  ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'user', 'vendor'));
```

Update TypeScript type:

```typescript
role: "admin" | "user" | "vendor";
```

**`competitions`** — add `created_by` column:

```sql
ALTER TABLE public.competitions
  ADD COLUMN created_by uuid REFERENCES auth.users(id);
```

### New tables

**`event_vendors`** — junction table linking vendors to events:

```sql
CREATE TABLE public.event_vendors (
  event_id   uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, user_id)
);

ALTER TABLE public.event_vendors ENABLE ROW LEVEL SECURITY;
```

**`recruitment_interests`** — tracks user interest in recruitment listings:

```sql
CREATE TABLE public.recruitment_interests (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id uuid NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (competition_id, user_id)
);

ALTER TABLE public.recruitment_interests ENABLE ROW LEVEL SECURITY;
```

## RLS Policies

### `event_vendors`

| Operation | Policy |
|-----------|--------|
| SELECT | `TO authenticated USING (true)` — vendors check their own assignments; admins manage all |
| INSERT | Admin only: `EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')` |
| UPDATE | Admin only (same check) |
| DELETE | Admin only (same check) |

### `competitions` (replace existing write policies)

| Operation | Policy |
|-----------|--------|
| SELECT | Unchanged — public read |
| INSERT | Admin OR (vendor AND `event_id` is in their `event_vendors` assignments) |
| UPDATE | Admin OR (vendor AND competition's `event_id` is in their assignments) |
| DELETE | Admin OR (vendor AND competition's `event_id` is in their assignments) |

Vendor write policy pattern:

```sql
EXISTS (
  SELECT 1 FROM public.profiles p
  WHERE p.id = auth.uid() AND p.role = 'admin'
)
OR
(
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'vendor'
  )
  AND
  EXISTS (
    SELECT 1 FROM public.event_vendors ev
    WHERE ev.user_id = auth.uid() AND ev.event_id = competitions.event_id
  )
)
```

### `competition_private_details` (replace existing write policies)

Same pattern as `competitions` — admin or vendor with matching event assignment via the parent `competitions.event_id`.

### `recruitment_interests`

| Operation | Policy |
|-----------|--------|
| SELECT | Own records: `user_id = auth.uid()`. Vendor/admin can see interests for competitions in their events: `EXISTS (SELECT 1 FROM competitions c JOIN event_vendors ev ON ev.event_id = c.event_id WHERE c.id = competition_id AND ev.user_id = auth.uid())` OR admin. |
| INSERT | Authenticated, `user_id = auth.uid()` only |
| DELETE | `user_id = auth.uid()` only |
| UPDATE | None (toggle via insert/delete) |

### Interest count

A public-safe aggregate is needed so unauthenticated or non-vendor users can see the count without accessing individual rows. Options:

- **DB function** (recommended): `get_interest_count(competition_id uuid) RETURNS int` using `SECURITY DEFINER` to bypass RLS for counting only.
- Alternative: a Postgres view that exposes only `(competition_id, count)`.

## Auth Model Changes

### `lib/supabase/types.ts`

```typescript
role: "admin" | "user" | "vendor";
```

### `components/auth-provider.tsx`

Add `isVendor` to the context:

```typescript
isVendor: profile?.role === "vendor",
```

### `lib/supabase/get-viewer.ts`

Return `isVendor` alongside `isAdmin`:

```typescript
return {
  supabase,
  user,
  role,
  isAdmin: role === "admin",
  isVendor: role === "vendor",
};
```

### New helper: `lib/supabase/check-event-vendor.ts`

Server-side check for whether the current user is a vendor assigned to a given event:

```typescript
export async function isEventVendor(supabase, userId: string, eventId: string): Promise<boolean>
```

## UI Changes

### 1. Admin: settings/users page

When editing a user whose role is `vendor`:

- Show a multi-select event picker below the role selector
- List all events (published + draft) with checkboxes
- On save: sync `event_vendors` rows (delete removed, insert added)
- When role changes away from `vendor`: delete all `event_vendors` rows for that user

### 2. Vendor entry point: /account page

Add a "My Events" section (visible only to vendor role):

- Query `event_vendors` joined with `events` for the current user
- Render event cards with name, cover image, status badge
- Each card links to `/events/[slug]`

### 3. Event detail page: /events/[slug] (client.tsx)

Recruitment tab button visibility:

| User type | "Create" button | "Edit/Delete" per item |
|-----------|----------------|----------------------|
| Admin | Yes | Yes (all items) |
| Vendor (assigned to this event) | Yes | Only items where `created_by = self` |
| Other authenticated users | No | No |
| Unauthenticated | No | No |

Pass `isEventVendor` as a server prop from the page component. The client component uses this alongside `isAdmin` to decide what to render.

### 4. Recruitment detail page: /events/[slug]/recruitment/[id]

New section at the bottom of the page:

**Unauthenticated**: No interest UI. Only basic recruitment info (unchanged).

**Authenticated user**:
- "I'm Interested" toggle button
- Interest count badge ("N people interested")
- If user has no `resume` in their profile, show a hint: "Upload your resume in your profile page first"
- Toggle inserts/deletes a `recruitment_interests` row

**Vendor (assigned to this event) or Admin**:
- No "I'm Interested" button for self
- Interest count + expandable applicant list
- Each row: avatar, display_name, bio snippet, resume link, link to `/profile/[id]`

## Component Architecture

### New components

- `RecruitmentInterestButton` — toggle button for expressing interest, handles insert/delete and optimistic UI
- `RecruitmentInterestList` — expandable list of interested users, used by vendor/admin view
- `EventVendorPicker` — multi-select event picker for the settings/users edit dialog
- `VendorEventsSection` — "My Events" card list for /account page

### Modified components

- `RecruitmentDialog` — pass `created_by` when inserting new competition
- `RecruitmentCard` — accept `canEdit` prop based on admin/vendor+owner check
- `AuthProvider` — add `isVendor` to context value
- Settings/users edit form — add role option + conditional event picker

## Migration Sequence

1. Add `vendor` to `profiles.role` check constraint
2. Create `event_vendors` table + RLS
3. Add `created_by` column to `competitions`
4. Create `recruitment_interests` table + RLS
5. Create `get_interest_count()` DB function
6. Replace `competitions` and `competition_private_details` write RLS policies to include vendor check

## Testing Considerations

- Contract test: vendor can only write to competitions under assigned events
- Contract test: vendor cannot edit competitions created by other vendors/admins
- Contract test: recruitment_interests enforces one-per-user-per-competition uniqueness
- Contract test: interest count is visible to unauthenticated users (via DB function)
- Contract test: interest applicant list is only visible to assigned vendor + admin
- Accessibility: interest button has clear toggle state and aria-pressed
- UI: vendor sees "My Events" on /account only when role is vendor
