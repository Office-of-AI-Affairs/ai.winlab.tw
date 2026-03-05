# Performance & Architecture Improvements

**Date:** 2026-03-05
**Scope:** Method B — High-impact performance + mid-impact architecture

---

## Summary

The project currently renders the homepage entirely client-side (5 `"use client"` sections with `useEffect` data fetching), causing loading spinners for all public visitors and no SEO value. Several utility functions are duplicated, the `/account` route uses an inefficient client-side redirect, and some data fetching patterns make unnecessary round trips.

This plan addresses 8 concrete issues grouped into 3 categories.

---

## Section 1: Home Page → Server Components

### Problem
All 5 home sections (`HomeCarousel`, `HomeIntroduction`, `HomeAnnouncement`, `HomeEvents`, `HomeContacts`) are `"use client"` components that fetch data in `useEffect`. Public visitors see loading spinners with no server-rendered content. Zero SEO value for homepage.

### Design
Convert each section to an **async Server Component** using the Supabase server client. Admin-only UI elements (edit buttons, "新增" buttons) that depend on `isAdmin` are extracted into small Client Components placed at the leaf of the tree.

Pattern:
```
HomeCarousel (server, async) → fetches slides, passes as props
  └─ CarouselClient (client) → handles embla, autoplay, edit button via useAuth()

HomeIntroduction (server, async) → fetches introduction row
  └─ IntroductionEditButton (client) → admin edit link via useAuth()

HomeAnnouncement (server, async) → fetches published announcements
  (no client wrapper needed — no admin UI on this section)

HomeEvents (server, async) → fetches published events
  (no client wrapper needed)

HomeContacts (server, async) → fetches contacts
  └─ ContactsEditButton (client) → admin edit link via useAuth()
```

**Files to change:**
- `components/home-carousel.tsx` → split into server fetcher + `CarouselClient`
- `components/home-introduction.tsx` → server component
- `components/home-announcement.tsx` → server component
- `components/home-events.tsx` → server component
- `components/home-contacts.tsx` → split into server fetcher + `ContactsEditButton`

---

## Section 2: Header, Image Optimization, Account Redirect

### 2a: Header Pinned Events — Server-side

**Problem:** `Header` fetches `pinnedEvents` in a `useEffect` on every page load, firing a DB query from every user's browser on every navigation.

**Design:** Fetch pinned events in `app/layout.tsx` (server) and pass as props to `Header`. `Header` remains a Client Component for mobile menu state and `useAuth()`, but the pinned events data arrives as a prop.

```tsx
// app/layout.tsx
const { data: pinnedEvents } = await supabase
  .from("events")
  .select("name, slug")
  .eq("pinned", true)
  .eq("status", "published")
  .order("sort_order", { ascending: true });

<Header pinnedEvents={pinnedEvents ?? []} />
```

**Note:** Authenticated users currently see draft pinned events too. Since layout is server-rendered without user session awareness easily, simplify to always show only `status = 'published'` pinned events in the header. Draft pinned events are still accessible via `/events`.

**Files to change:**
- `app/layout.tsx`
- `components/header.tsx` — accept `pinnedEvents` prop, remove `useEffect` fetch

### 2b: Next.js Image Optimization

**Problem:** `next.config.ts` is empty. All Supabase storage image URLs are rendered with `unoptimized={true}`, bypassing WebP conversion, resizing, and lazy loading.

**Design:** Add `images.remotePatterns` to `next.config.ts` for the Supabase storage hostname. Then remove `unoptimized` props and the `isExternalImage` checks used solely to set `unoptimized`.

```ts
// next.config.ts
const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};
```

**Files to change:**
- `next.config.ts`
- Remove `unoptimized` props from `<Image>` components across the codebase once the domain is whitelisted

### 2c: `/account` Server-side Redirect

**Problem:** `app/account/page.tsx` is a client component that renders a spinner then does `router.replace()` in a `useEffect`. Users visiting `/account` see a flash of spinner before being redirected.

**Design:** Replace with a server component that reads the session and calls `redirect()` directly.

```tsx
// app/account/page.tsx (server component)
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function AccountPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  redirect(`/profile/${user.id}`);
}
```

**Files to change:**
- `app/account/page.tsx`

---

## Section 3: Code Architecture

### 3a: Extract `isExternalImage` to `lib/utils.ts`

**Problem:** The same helper is defined independently in 4 files:
- `app/profile/[id]/page.tsx`
- `app/events/[slug]/page.tsx`
- `components/event-card.tsx`
- `components/result-card.tsx`

**Design:** Add to `lib/utils.ts`, remove 4 local definitions, add import.

```ts
// lib/utils.ts
export function isExternalImage(src: string | null | undefined): boolean {
  return !!(src && (src.startsWith("http://") || src.startsWith("https://")));
}
```

### 3b: Event Detail Page — Reduce Query Count

**Problem:** `fetchResults` in `app/events/[slug]/page.tsx` fires 3 sequential/parallel queries: results → profiles (via `in`) + teams (via `in`). Total page load is 4–6 queries.

**Design:** Use Supabase foreign table join to fetch results with author and team name in a single query:

```ts
supabase
  .from("results")
  .select("*, profiles!author_id(display_name), teams!team_id(name)")
  .eq("event_id", eventId)
  .order("pinned", { ascending: false })
  .order("date", { ascending: false })
```

This reduces `fetchResults` from 3 queries to 1, and total page queries from 6 to 4.

**Files to change:**
- `app/events/[slug]/page.tsx` — rewrite `fetchResults`, update `ResultWithMeta` type mapping

### 3c: Tag Toggle — Parallel Round Trips

**Problem:** `handleTagToggle` in `app/result/[id]/edit/page.tsx` executes DELETE then INSERT sequentially (2 serial round trips, ~200ms each = ~400ms total lag).

**Design:** Fire both operations concurrently with `Promise.all`. The intermediate "no tag" state is the same whether serial or parallel (brief), but total time halves:

```ts
await Promise.all([
  supabase.from("result_tags").delete().eq("result_id", id),
  supabase.from("result_tags").insert({ result_id: id, tag_id: tagId }),
]);
```

For the deselect case (removing a tag), keep single DELETE.

**Files to change:**
- `app/result/[id]/edit/page.tsx`

---

## Non-goals

- Profile page view/edit split (deferred — high risk, low urgency)
- `supabase` client in deps array cleanup (cosmetic, no runtime impact)
- Tag atomic transaction via DB function (overkill for single-select UX)

---

## Implementation Order

1. `lib/utils.ts` — add `isExternalImage` (touches everything else)
2. `next.config.ts` — image domains (unblocks removing `unoptimized`)
3. `app/account/page.tsx` — server redirect (isolated, zero risk)
4. Tag toggle parallel (isolated to one file)
5. Event detail join query (isolated to one file)
6. Header pinned events as prop (layout + header)
7. Home sections → Server Components (largest change, do last)
