# Vendor Role Feature Design

## Overview

Add a "vendor" role that allows companies/organizations to manage their own recruitment listings under specific events. Vendors are assigned to events by admins and can publish, edit, and manage recruitment entries. Logged-in users can express interest in recruitment listings, creating a lightweight application flow backed by their profile and resume.

## Requirements

1. Admin can assign the `vendor` role to any user via settings/users and bind them to one or more events.
2. Vendors can create, edit, and delete recruitment entries **only** under their assigned events.
3. Vendors can only edit/delete recruitment entries **they created** (`created_by = auth.uid()`).
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

Update TypeScript types in `lib/supabase/types.ts`:

```typescript
// Profile type
role: "admin" | "user" | "vendor";

// Recruitment and RecruitmentSummary types — add:
created_by: string | null;
```

**`competitions`** — add `created_by` column:

```sql
ALTER TABLE public.competitions
  ADD COLUMN created_by uuid REFERENCES auth.users(id);
```

Note: existing admin-created rows will have `created_by = NULL`. This is intentional — admin can edit all listings regardless of `created_by`. The `created_by` check only applies to vendor-role write policies.

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

### Data lifecycle: vendor removed from event

When an admin removes a vendor from an event (deletes the `event_vendors` row), the vendor's recruitment listings under that event **remain in place** but the vendor loses edit/delete access. The listings become read-only orphans that only an admin can modify or delete. This is intentional — removing a vendor should not destroy published content.

## RLS Policies

### `event_vendors`

| Operation | Policy |
|-----------|--------|
| SELECT | Vendor sees own rows; admin sees all: `USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))` |
| INSERT | Admin only: `EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')` |
| UPDATE | Admin only (same check) |
| DELETE | Admin only (same check) |

### `competitions` (replace existing write policies)

| Operation | Policy |
|-----------|--------|
| SELECT | Unchanged — public read |
| INSERT | Admin OR (vendor AND `event_id` is in their `event_vendors` assignments) |
| UPDATE | Admin OR (vendor AND `event_id` is in their assignments AND `created_by = auth.uid()`) |
| DELETE | Admin OR (vendor AND `event_id` is in their assignments AND `created_by = auth.uid()`) |

Full vendor write policy for UPDATE/DELETE:

```sql
-- Admin branch: unrestricted
EXISTS (
  SELECT 1 FROM public.profiles p
  WHERE p.id = auth.uid() AND p.role = 'admin'
)
OR
-- Vendor branch: must be assigned to event AND must own the listing
(
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'vendor'
  )
  AND competitions.created_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.event_vendors ev
    WHERE ev.user_id = auth.uid() AND ev.event_id = competitions.event_id
  )
)
```

INSERT policy for vendors omits the `created_by` check (new row, no prior owner):

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
  AND EXISTS (
    SELECT 1 FROM public.event_vendors ev
    WHERE ev.user_id = auth.uid() AND ev.event_id = competitions.event_id
  )
)
```

### `competition_private_details` (replace existing write policies)

Same pattern as `competitions` — admin or vendor with matching event assignment AND `created_by` ownership. The join path is through the parent `competitions` row:

```sql
-- UPDATE policy (both USING and WITH CHECK clauses):
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
  AND EXISTS (
    SELECT 1 FROM public.competitions c
    JOIN public.event_vendors ev ON ev.event_id = c.event_id
    WHERE c.id = competition_private_details.competition_id
      AND c.created_by = auth.uid()
      AND ev.user_id = auth.uid()
  )
)
```

INSERT and DELETE use the same pattern. UPDATE must include both `USING` and `WITH CHECK` clauses with the same expression.

### `recruitment_interests`

| Operation | Policy |
|-----------|--------|
| SELECT | Own records: `user_id = auth.uid()`. Vendor can see interests for competitions in their assigned events. Admin sees all. |
| INSERT | Authenticated, `user_id = auth.uid()` only |
| DELETE | `user_id = auth.uid()` only |
| UPDATE | Not allowed (toggle via insert/delete) |

Full SELECT policy:

```sql
-- Users see own interest records
user_id = auth.uid()
OR
-- Admin sees all
EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
OR
-- Vendor sees interests for competitions under their assigned events
EXISTS (
  SELECT 1 FROM competitions c
  JOIN event_vendors ev ON ev.event_id = c.event_id
  WHERE c.id = recruitment_interests.competition_id
    AND ev.user_id = auth.uid()
)
```

### Interest count function

Public-safe aggregate function using `SECURITY DEFINER` to bypass RLS for counting only:

```sql
CREATE OR REPLACE FUNCTION public.get_interest_count(p_competition_id uuid)
RETURNS int
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::int
  FROM public.recruitment_interests
  WHERE competition_id = p_competition_id;
$$;

-- Grant execute to all roles including anon
GRANT EXECUTE ON FUNCTION public.get_interest_count(uuid) TO anon, authenticated;
```

This function exposes only the count, never individual `user_id` values.

## Auth Model Changes

### `lib/supabase/types.ts`

```typescript
// Profile type
role: "admin" | "user" | "vendor";

// Recruitment type — add field:
created_by: string | null;

// RecruitmentSummary type — add field:
created_by: string | null;
```

### `components/auth-provider.tsx`

Add `isVendor` to `AuthContextType` interface and context value:

```typescript
// AuthContextType interface — add:
isVendor: boolean;

// Context value — add:
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
export async function isEventVendor(
  supabase: SupabaseClient,
  userId: string,
  eventId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("event_vendors")
    .select("event_id")
    .eq("user_id", userId)
    .eq("event_id", eventId)
    .single();
  return Boolean(data);
}
```

## UI Changes

### 1. Admin: settings/users page

The current `UsersTable` component renders a read-only table with no row-level editing. This feature requires **building a new user-edit dialog** from scratch:

- Row click or edit button opens a dialog/sheet
- Dialog shows: display name (read-only), email (read-only), role selector
- Role selector: `user` / `vendor` / `admin`
- **When role is `vendor`**: show a multi-select event picker below the role selector. List all events (published + draft) with checkboxes.
- On save: update `profiles.role` + sync `event_vendors` rows (delete removed, insert added)
- When role changes away from `vendor`: delete all `event_vendors` rows for that user
- `roleLabel` map must be extended to include `vendor: "廠商"`

### 2. Vendor entry point: /account page

Add a "My Events" section (visible only to vendor role):

- Query `event_vendors` joined with `events` for the current user
- Render event cards with name, cover image, status badge
- Each card links to `/events/[slug]`
- Include a loading skeleton for this section

### 3. Event detail page: /events/[slug] (client.tsx)

Recruitment tab button visibility:

| User type | "Create" button | "Edit/Delete" per item |
|-----------|----------------|----------------------|
| Admin | Yes | Yes (all items) |
| Vendor (assigned to this event) | Yes | Only items where `created_by = self` |
| Other authenticated users | No | No |
| Unauthenticated | No | No |

Server-side: the page component fetches `isEventVendor` via the new helper and passes it as a prop. The client component uses `isAdmin || isEventVendor` for the create button, and `isAdmin || (isEventVendor && item.created_by === userId)` for per-item edit/delete.

### 4. Recruitment detail page: /events/[slug]/recruitment/[id]

This page is currently documented as admin-only in AGENTS.md. It must be **opened to all users** (with different views based on role):

**Server-side changes to page.tsx:**
- Remove admin-only guard (if any). The page is publicly viewable for published recruitment.
- Fetch `created_by` in the recruitment query.
- Determine viewer type: unauthenticated / authenticated user / vendor (via `isEventVendor` check) / admin.
- Fetch interest count via `get_interest_count()` RPC.
- If viewer is vendor/admin: also fetch `recruitment_interests` joined with `profiles` for the applicant list.
- Pass all computed props to the client component.

**Client-side sections at page bottom:**

**Unauthenticated**: No interest UI. Only basic recruitment info (unchanged).

**Authenticated user**:
- "I'm Interested" toggle button with `aria-pressed`
- Interest count badge ("N people interested")
- If user has no `resume` in their profile, show a hint: "Upload your resume in your profile page first"
- Toggle inserts/deletes a `recruitment_interests` row

**Vendor (assigned to this event) or Admin**:
- No "I'm Interested" button for self
- Interest count + expandable applicant list
- Each row: avatar, display_name, bio snippet, resume link, link to `/profile/[id]`

### 5. RecruitmentDialog changes

When inserting a new competition, include `created_by: user.id` in the payload. Admin-created listings will also set `created_by` for consistency going forward (existing rows with `NULL` remain admin-editable).

## Component Architecture

### New components

- `RecruitmentInterestButton` — toggle button for expressing interest, handles insert/delete and optimistic UI
- `RecruitmentInterestList` — expandable list of interested users, used by vendor/admin view
- `EventVendorPicker` — multi-select event picker for the settings/users edit dialog
- `VendorEventsSection` — "My Events" card list for /account page
- `UserEditDialog` — new dialog for editing user role + vendor event assignments

### Modified components

- `RecruitmentDialog` — include `created_by` in insert payload
- `RecruitmentCard` — accept `canEdit` prop based on admin/vendor+owner check
- `AuthProvider` — add `isVendor: boolean` to `AuthContextType` and context value
- `UsersTable` — add row click handler to open `UserEditDialog`

## Migration Sequence

1. Add `vendor` to `profiles.role` check constraint
2. Create `event_vendors` table + RLS (scoped SELECT)
3. Add `created_by` column to `competitions`
4. Create `recruitment_interests` table + RLS
5. Create `get_interest_count()` SECURITY DEFINER function
6. Replace `competitions` write RLS policies to include vendor + `created_by` check
7. Replace `competition_private_details` write RLS policies with vendor + `created_by` + `WITH CHECK`

## Documentation Updates

- `AGENTS.md` line ~100: update `/events/[slug]/recruitment/[id]/page.tsx` from "admin only" to "public view with role-based interest UI; vendor/admin can manage"
- `AGENTS.md` data model section: add `event_vendors` and `recruitment_interests` tables
- `AGENTS.md` auth model: document `vendor` role and `isEventVendor` helper

## Testing Considerations

- Contract test: vendor can only write to competitions under assigned events
- Contract test: vendor cannot edit competitions created by other vendors or admins
- Contract test: `competition_private_details` UPDATE enforces both USING and WITH CHECK for vendor
- Contract test: `event_vendors` SELECT only returns own rows for non-admin users
- Contract test: `recruitment_interests` enforces one-per-user-per-competition uniqueness
- Contract test: `get_interest_count()` returns correct count and exposes no user IDs
- Contract test: interest applicant list is only visible to assigned vendor + admin
- Accessibility: interest button has clear toggle state and `aria-pressed`
- UI: vendor sees "My Events" on /account only when role is vendor
- Loading states: all new sections have matching skeletons
