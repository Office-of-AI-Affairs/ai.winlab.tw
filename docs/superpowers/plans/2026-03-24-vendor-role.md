# Vendor Role Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a vendor role so companies can manage recruitment listings under assigned events, and users can express interest in listings.

**Architecture:** New `event_vendors` and `recruitment_interests` tables with RLS enforcing vendor scoping. Vendor write access to `competitions` is gated by `event_vendors` assignment + `created_by` ownership at the DB level. A `SECURITY DEFINER` function exposes interest counts publicly. Frontend changes extend the existing admin pattern to include vendor checks.

**Tech Stack:** Supabase (Postgres RLS, migrations), Next.js 16 App Router, TypeScript, shadcn/ui, Bun

**Spec:** `docs/superpowers/specs/2026-03-24-vendor-role-design.md`

---

## File Map

### New files

| File | Responsibility |
|------|---------------|
| `supabase/migrations/20260324000001_vendor_role.sql` | All schema changes: role constraint, event_vendors, recruitment_interests, created_by, RLS, get_interest_count() |
| `lib/supabase/check-event-vendor.ts` | Server-side helper to check vendor-event assignment |
| `components/user-edit-dialog.tsx` | Dialog for editing user role + event vendor picker |
| `components/event-vendor-picker.tsx` | Multi-select event checkbox picker for vendor assignment |
| `components/vendor-events-section.tsx` | "My Events" card list for vendor profile page |
| `components/recruitment-interest-button.tsx` | Toggle button for expressing interest |
| `components/recruitment-interest-list.tsx` | Expandable applicant list for vendor/admin |

### Modified files

| File | Change |
|------|--------|
| `lib/supabase/types.ts:63` | Add `"vendor"` to role union |
| `lib/supabase/types.ts:189` | Add `created_by` to Recruitment |
| `lib/supabase/types.ts:202` | Add `created_by` to RecruitmentSummary |
| `lib/supabase/get-viewer.ts:19-24` | Add `isVendor` return field |
| `components/auth-provider.tsx:16-24` | Add `isVendor` to AuthContextType |
| `components/auth-provider.tsx:160-168` | Add `isVendor` to context value |
| `components/recruitment-dialog.tsx:329-333` | Include `created_by` in insert payload via `useAuth()` |
| `app/events/[slug]/page.tsx:~53` | Add `created_by` to competitions select, pass vendor props |
| `app/events/[slug]/client.tsx:216,233` | Extend admin checks to include vendor |
| `lib/recruitment-records.ts` | Forward `created_by` in `composeRecruitment` |
| `app/events/[slug]/recruitment/[id]/page.tsx` | Add interest UI, open to all users |
| `app/profile/[id]/client.tsx` | Add vendor events section when isOwner + isVendor |
| `app/settings/users/client.tsx:13-16` | Add vendor to roleLabel, lift UserEditDialog here |
| `components/users-table.tsx` | Add edit button per row, accept onEditUser callback |
| `AGENTS.md` | Document vendor role, event_vendors, recruitment_interests |

---

## Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/20260324000001_vendor_role.sql`

This single migration handles all schema changes. It must be applied through the Supabase SQL editor.

- [ ] **Step 1: Write the migration file**

```sql
-- 1. Extend role constraint
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check,
  ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'user', 'vendor'));

-- 2. Create event_vendors junction table
CREATE TABLE public.event_vendors (
  event_id   uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, user_id)
);

ALTER TABLE public.event_vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendor sees own rows, admin sees all"
  ON public.event_vendors FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admin can insert event_vendors"
  ON public.event_vendors FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admin can update event_vendors"
  ON public.event_vendors FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admin can delete event_vendors"
  ON public.event_vendors FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- 3. Add created_by to competitions
ALTER TABLE public.competitions
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- 4. Create recruitment_interests table
CREATE TABLE public.recruitment_interests (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id uuid NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (competition_id, user_id)
);

ALTER TABLE public.recruitment_interests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own interests, vendor sees event interests, admin sees all"
  ON public.recruitment_interests FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    OR EXISTS (
      SELECT 1 FROM public.competitions c
      JOIN public.event_vendors ev ON ev.event_id = c.event_id
      WHERE c.id = recruitment_interests.competition_id
        AND ev.user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated user can insert own interest"
  ON public.recruitment_interests FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "User can delete own interest"
  ON public.recruitment_interests FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- 5. Interest count function (SECURITY DEFINER — bypasses RLS for count only)
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

GRANT EXECUTE ON FUNCTION public.get_interest_count(uuid) TO anon, authenticated;

-- 6. Replace competitions write policies to include vendor
DROP POLICY IF EXISTS "Admin can insert competition" ON public.competitions;
DROP POLICY IF EXISTS "Admin can update competition" ON public.competitions;
DROP POLICY IF EXISTS "Admin can delete competition" ON public.competitions;

CREATE POLICY "Admin or assigned vendor can insert competition"
  ON public.competitions FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    OR (
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'vendor')
      AND EXISTS (
        SELECT 1 FROM public.event_vendors ev
        WHERE ev.user_id = auth.uid() AND ev.event_id = competitions.event_id
      )
    )
  );

CREATE POLICY "Admin or owning vendor can update competition"
  ON public.competitions FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    OR (
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'vendor')
      AND competitions.created_by = auth.uid()
      AND EXISTS (
        SELECT 1 FROM public.event_vendors ev
        WHERE ev.user_id = auth.uid() AND ev.event_id = competitions.event_id
      )
    )
  );

CREATE POLICY "Admin or owning vendor can delete competition"
  ON public.competitions FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    OR (
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'vendor')
      AND competitions.created_by = auth.uid()
      AND EXISTS (
        SELECT 1 FROM public.event_vendors ev
        WHERE ev.user_id = auth.uid() AND ev.event_id = competitions.event_id
      )
    )
  );

-- 7. Replace competition_private_details write policies to include vendor
DROP POLICY IF EXISTS "Admin can insert competition_private_details" ON public.competition_private_details;
DROP POLICY IF EXISTS "Admin can update competition_private_details" ON public.competition_private_details;
DROP POLICY IF EXISTS "Admin can delete competition_private_details" ON public.competition_private_details;

CREATE POLICY "Admin or owning vendor can insert competition_private_details"
  ON public.competition_private_details FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    OR (
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'vendor')
      AND EXISTS (
        SELECT 1 FROM public.competitions c
        JOIN public.event_vendors ev ON ev.event_id = c.event_id
        WHERE c.id = competition_private_details.competition_id
          AND c.created_by = auth.uid()
          AND ev.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Admin or owning vendor can update competition_private_details"
  ON public.competition_private_details FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    OR (
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'vendor')
      AND EXISTS (
        SELECT 1 FROM public.competitions c
        JOIN public.event_vendors ev ON ev.event_id = c.event_id
        WHERE c.id = competition_private_details.competition_id
          AND c.created_by = auth.uid()
          AND ev.user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    OR (
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'vendor')
      AND EXISTS (
        SELECT 1 FROM public.competitions c
        JOIN public.event_vendors ev ON ev.event_id = c.event_id
        WHERE c.id = competition_private_details.competition_id
          AND c.created_by = auth.uid()
          AND ev.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Admin or owning vendor can delete competition_private_details"
  ON public.competition_private_details FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    OR (
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'vendor')
      AND EXISTS (
        SELECT 1 FROM public.competitions c
        JOIN public.event_vendors ev ON ev.event_id = c.event_id
        WHERE c.id = competition_private_details.competition_id
          AND c.created_by = auth.uid()
          AND ev.user_id = auth.uid()
      )
    )
  );
```

- [ ] **Step 2: Apply migration via Supabase SQL editor**

Run the contents of `supabase/migrations/20260324000001_vendor_role.sql` in the Supabase Dashboard SQL Editor. Verify no errors.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260324000001_vendor_role.sql
git commit -m "feat: add vendor role migration with event_vendors, recruitment_interests, and RLS"
```

---

## Task 2: TypeScript Types and Auth Model

**Files:**
- Modify: `lib/supabase/types.ts:63,189,202`
- Modify: `lib/supabase/get-viewer.ts:19-24`
- Modify: `components/auth-provider.tsx:16-24,160-168`
- Create: `lib/supabase/check-event-vendor.ts`

- [ ] **Step 1: Update Profile role type**

In `lib/supabase/types.ts:63`, change:
```typescript
role: "admin" | "user";
```
to:
```typescript
role: "admin" | "user" | "vendor";
```

- [ ] **Step 2: Add created_by to Recruitment and RecruitmentSummary**

In `lib/supabase/types.ts`, add `created_by: string | null;` as the last field of both `Recruitment` (after line 189) and `RecruitmentSummary` (after line 202).

- [ ] **Step 3: Add RecruitmentInterest type**

In `lib/supabase/types.ts`, add after the RecruitmentSummary type:

```typescript
export type RecruitmentInterest = {
  id: string;
  competition_id: string;
  user_id: string;
  created_at: string;
};
```

- [ ] **Step 4: Update get-viewer.ts**

In `lib/supabase/get-viewer.ts`, change the return statement (lines 19-24) to:

```typescript
return {
  supabase,
  user,
  role,
  isAdmin: role === "admin",
  isVendor: role === "vendor",
}
```

- [ ] **Step 5: Update AuthProvider**

In `components/auth-provider.tsx`:

1. Add `isVendor: boolean;` to `AuthContextType` interface (after line 19).
2. Add `isVendor: profile?.role === "vendor",` to the context value (after line 163).

- [ ] **Step 6: Create check-event-vendor helper**

Create `lib/supabase/check-event-vendor.ts`:

```typescript
import type { SupabaseClient } from "@supabase/supabase-js";

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

- [ ] **Step 7: Run lint and tests**

```bash
bun lint
bun test
```

- [ ] **Step 8: Commit**

```bash
git add lib/supabase/types.ts lib/supabase/get-viewer.ts components/auth-provider.tsx lib/supabase/check-event-vendor.ts
git commit -m "feat: add vendor role to types, auth context, and event-vendor helper"
```

---

## Task 3: Admin User Edit Dialog

**Files:**
- Create: `components/user-edit-dialog.tsx`
- Create: `components/event-vendor-picker.tsx`
- Modify: `app/settings/users/client.tsx:13-16`
- Modify: `components/users-table.tsx`

- [ ] **Step 1: Add vendor to roleLabel**

In `app/settings/users/client.tsx:13-16`, add `vendor: "廠商"`:

```typescript
const roleLabel: Record<string, string> = {
  admin: "管理員",
  user: "一般用戶",
  vendor: "廠商",
};
```

- [ ] **Step 2: Create EventVendorPicker component**

Create `components/event-vendor-picker.tsx`:

- Client component (`"use client"`)
- Props: `selectedEventIds: string[]`, `onChange: (ids: string[]) => void`
- Fetches all events (published + draft) on mount via `supabase.from("events").select("id, name, status").order("name")`
- Renders checkboxes using shadcn `Checkbox` + `Label` for each event
- Shows event name + status badge per row
- Loading skeleton while fetching

- [ ] **Step 3: Create UserEditDialog component**

Create `components/user-edit-dialog.tsx` with:

- Props: `user: UserRow | null`, `open: boolean`, `onOpenChange: (open: boolean) => void`, `onSaved: () => void`
- Uses shadcn `Dialog` component (consistent with existing `RecruitmentDialog`)
- Shows: display name (read-only), email (read-only), role selector
- Role selector: `user` / `vendor` / `admin` using shadcn `Select`
- When role is `vendor`: render `<EventVendorPicker />` below the role selector
- Fetches current `event_vendors` for the user on dialog open (if vendor role)
- On save:
  1. Update `profiles.role` via `supabase.from("profiles").update({ role }).eq("id", user.id)`
  2. If vendor: sync `event_vendors` — delete removed, insert added
  3. If role changed away from vendor: delete all `event_vendors` for user via `supabase.from("event_vendors").delete().eq("user_id", user.id)`
- Include loading and error states with toast feedback
- Uses `createClient` from `@/lib/supabase/client` (client component)

- [ ] **Step 4: Wire UserEditDialog into settings page**

The `UserEditDialog` must be lifted to `app/settings/users/client.tsx` (not `UsersTable`) because `refreshUsers` lives there.

In `app/settings/users/client.tsx`:
1. Add state: `const [editingUser, setEditingUser] = useState<UserRow | null>(null)`
2. Pass `onEditUser={setEditingUser}` as a prop to `<UsersTable />`
3. Render `<UserEditDialog user={editingUser} open={!!editingUser} onOpenChange={() => setEditingUser(null)} onSaved={refreshUsers} />`

In `components/users-table.tsx`:
1. Accept new prop: `onEditUser: (user: UserRow) => void`
2. Add edit button per row (small pencil icon, `aria-label="編輯使用者"`)
3. Button calls `onEditUser(user)` on click

- [ ] **Step 5: Run lint and test**

```bash
bun lint
bun test
```

- [ ] **Step 6: Commit**

```bash
git add components/user-edit-dialog.tsx components/event-vendor-picker.tsx components/users-table.tsx app/settings/users/client.tsx
git commit -m "feat: add user edit dialog with vendor role and event assignment"
```

---

## Task 4: Vendor Events Section on Profile Page

**Files:**
- Create: `components/vendor-events-section.tsx`
- Modify: `app/profile/[id]/client.tsx`

- [ ] **Step 1: Create VendorEventsSection component**

Create `components/vendor-events-section.tsx`:

- Client component (`"use client"`)
- Props: none (fetches own data using supabase client)
- Fetches `event_vendors` joined with `events` for the current user: `supabase.from("event_vendors").select("event_id, events(id, name, slug, cover_image, status)").eq("user_id", user.id)`
- Renders event cards in a grid: name, cover image (via `next/image`), status badge
- Each card links to `/events/[slug]` using `AppLink`
- Empty state: "尚未被分配到任何活動"
- Follow project card conventions (`components/ui/card.tsx`, `rounded-[2rem]`)
- Use `interactive-scale` pattern for hover
- **Include a loading skeleton**: show 2-3 `Skeleton` cards matching the card layout while fetching (per AGENTS.md skeleton conventions)

- [ ] **Step 2: Add VendorEventsSection to profile page**

In `app/profile/[id]/client.tsx`, when `isOwner` is true:

1. Import `useAuth` and check `isVendor`
2. If `isOwner && isVendor`, render `<VendorEventsSection />` in a new section before the results section
3. Section title: "我管理的活動"

- [ ] **Step 3: Run lint and test**

```bash
bun lint
bun test
```

- [ ] **Step 4: Commit**

```bash
git add components/vendor-events-section.tsx app/profile/\[id\]/client.tsx
git commit -m "feat: add vendor events section to profile page"
```

---

## Task 5: Event Detail — Vendor Recruitment Management

**Files:**
- Modify: `app/events/[slug]/page.tsx:~53` (competitions select + vendor prop passing)
- Modify: `app/events/[slug]/client.tsx:216,233`
- Modify: `lib/recruitment-records.ts` (forward `created_by` in composeRecruitment)
- Modify: `components/recruitment-dialog.tsx:329-333`
- Modify: `components/recruitment-card.tsx` (add `canEdit` prop)

- [ ] **Step 1: Add created_by to competitions query in page.tsx**

In `app/events/[slug]/page.tsx`, find the competitions select query (~line 53) and add `created_by` to the select string. This is where recruitment data is fetched — `client.tsx` receives it as a prop and does no fetching.

- [ ] **Step 2: Forward created_by in composeRecruitment**

Check `lib/recruitment-records.ts` — the `composeRecruitment` function assembles `Recruitment` from `RecruitmentSummary` + private details. If it uses an explicit field spread (not `...summary`), add `created_by: summary.created_by` to the returned object. If it uses a generic spread, verify `created_by` flows through.

- [ ] **Step 3: Pass vendor status from server to client**

In `app/events/[slug]/page.tsx`:

1. Import `isEventVendor` from `@/lib/supabase/check-event-vendor`
2. After fetching the event data, if user is logged in and not admin, check `await isEventVendor(supabase, user.id, event.id)`
3. Pass `isEventVendor: boolean` and `userId: string | null` as props to the client component

- [ ] **Step 4: Update RecruitmentCard to accept canEdit**

In `components/recruitment-card.tsx`, the current `onEdit` prop already serves as the edit control (button shows only when `onEdit` is defined). No new prop needed — the ownership check stays at the call site in `client.tsx`.

- [ ] **Step 5: Update client.tsx recruitment tab visibility**

In `app/events/[slug]/client.tsx`:

1. Accept new props: `isEventVendor: boolean`, `userId: string | null`
2. Change the "新增徵才" button guard (line 216) from `{isAdmin && (` to `{(isAdmin || isEventVendor) && (`
3. Change the edit button guard (line 233) from `onEdit={isAdmin ? ...}` to:
   ```typescript
   onEdit={(isAdmin || (isEventVendor && item.created_by === userId)) ? () => openEditSheet(item) : undefined}
   ```

- [ ] **Step 6: Include created_by in recruitment insert**

In `components/recruitment-dialog.tsx`:

1. Add `import { useAuth } from "@/components/auth-provider";` at the top
2. Inside the component, add `const { user } = useAuth();`
3. Change the insert (line 329-333) from:
   ```typescript
   .insert({ ...publicPayload, event_id: eventId })
   ```
   to:
   ```typescript
   .insert({ ...publicPayload, event_id: eventId, created_by: user?.id })
   ```

- [ ] **Step 7: Run lint and test**

```bash
bun lint
bun test
```

- [ ] **Step 8: Commit**

```bash
git add app/events/\[slug\]/page.tsx app/events/\[slug\]/client.tsx lib/recruitment-records.ts components/recruitment-dialog.tsx components/recruitment-card.tsx
git commit -m "feat: allow vendors to manage recruitment in assigned events"
```

---

## Task 6: Recruitment Interest UI

**Files:**
- Create: `components/recruitment-interest-button.tsx`
- Create: `components/recruitment-interest-list.tsx`
- Modify: `app/events/[slug]/recruitment/[id]/page.tsx`

- [ ] **Step 1: Create RecruitmentInterestButton**

Create `components/recruitment-interest-button.tsx`:

- Client component
- Props: `competitionId: string`, `initialInterested: boolean`, `initialCount: number`, `hasResume: boolean`
- Uses optimistic UI for the toggle
- INSERT `recruitment_interests` on click (if not interested)
- DELETE `recruitment_interests` on click (if already interested)
- Shows count badge: "N 人感興趣"
- If `!hasResume`, show hint text: "請先到個人頁面上傳履歷"
- Button uses `aria-pressed` for accessibility
- Uses shadcn `Button` with variant toggle styling

- [ ] **Step 2: Create RecruitmentInterestList**

Create `components/recruitment-interest-list.tsx`:

- Client component
- Props: `applicants: Array<{ id, display_name, avatar_url, bio, resume }>`, `count: number`
- Expandable section (collapsed by default, shows count)
- When expanded: list each applicant with avatar, name, bio snippet, resume link, profile link (`/profile/[id]`)
- Uses `AppLink` for profile links
- Uses `next/image` for avatars

- [ ] **Step 3: Update recruitment detail page server component**

Rewrite `app/events/[slug]/recruitment/[id]/page.tsx`:

1. Remove any admin-only guard — this page is now publicly viewable for published recruitment
2. Fetch the competition with `created_by` included in select
3. Determine viewer type:
   ```typescript
   const { data: { user } } = await supabase.auth.getUser();
   ```
   - If user: fetch profile role via `supabase.from("profiles").select("role, resume").eq("id", user.id).single()`
   - If vendor: check `await isEventVendor(supabase, user.id, eventId)`
4. Fetch interest count via `supabase.rpc("get_interest_count", { p_competition_id: id })`
5. If user logged in: check if user already expressed interest via `supabase.from("recruitment_interests").select("id").eq("competition_id", id).eq("user_id", user.id).single()`
6. If viewer is vendor/admin: fetch applicant list via `supabase.from("recruitment_interests").select("user_id, profiles(id, display_name, avatar_url, bio, resume)").eq("competition_id", id)`
7. Check if current user has resume: `profile?.resume`
8. Pass all data to client components

- [ ] **Step 4: Wire interest components into recruitment detail page**

In the recruitment detail page's JSX, after the existing recruitment content:

- If user is logged in and NOT vendor/admin for this event: render `<RecruitmentInterestButton />`
- If user is vendor for this event or admin: render `<RecruitmentInterestList />`
- If not logged in: no interest UI (per spec, unauthenticated users see basic recruitment info only)

- [ ] **Step 5: Run lint and test**

```bash
bun lint
bun test
```

- [ ] **Step 6: Commit**

```bash
git add components/recruitment-interest-button.tsx components/recruitment-interest-list.tsx app/events/\[slug\]/recruitment/\[id\]/page.tsx
git commit -m "feat: add recruitment interest button and applicant list"
```

---

## Task 7: Documentation and Cleanup

**Files:**
- Modify: `AGENTS.md`

- [ ] **Step 1: Update AGENTS.md**

1. In the data model section, add:
   - `EventVendor`: junction table linking vendors to events
   - `RecruitmentInterest`: user interest in recruitment listings
2. In the auth model section, add:
   - `vendor` role description
   - `isEventVendor` helper
3. In the page structure section:
   - Update `/events/[slug]/recruitment/[id]` from "admin only" to "public view with role-based interest UI"
   - Add note about vendor events section on profile page

- [ ] **Step 2: Check sibling MCP repo**

Per AGENTS.md maintenance note: after changing schemas or admin workflows, check whether `~/mcp.ai.winlab.tw` needs matching updates for new tables (`event_vendors`, `recruitment_interests`) and the `vendor` role.

- [ ] **Step 3: Run full test suite**

```bash
bun lint
bun test
```

Fix any failing contract tests that reference old role assumptions.

- [ ] **Step 4: Commit**

```bash
git add AGENTS.md
git commit -m "docs: document vendor role, event_vendors, and recruitment_interests"
```

---

## Execution Order Summary

| Task | Dependency | Description |
|------|-----------|-------------|
| 1 | None | Database migration (apply via SQL editor) |
| 2 | Task 1 | TypeScript types + auth model |
| 3 | Task 2 | Admin user edit dialog |
| 4 | Task 2 | Vendor events section on profile |
| 5 | Task 2 | Event detail vendor recruitment management |
| 6 | Task 5 | Recruitment interest UI |
| 7 | Task 6 | Documentation |

Tasks 3, 4, and 5 can run in parallel after Task 2. Task 6 depends on Task 5. Task 7 is last.
