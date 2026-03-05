# Performance & Architecture Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Convert homepage to SSR, eliminate duplicated utilities, optimize images, and reduce unnecessary client-side round trips.

**Architecture:** Home sections become async Server Components that fetch data server-side and pass serializable props to leaf Client Components for interactivity. Admin-only UI elements are extracted into small `"use client"` wrappers. The Supabase server client (`lib/supabase/server.ts`) is used in all server contexts.

**Tech Stack:** Next.js 16 App Router, Supabase SSR (`@supabase/ssr`), TypeScript, Tailwind CSS v4, bun

---

## Task 1: Extract `isExternalImage` to `lib/utils.ts`

**Files:**
- Modify: `lib/utils.ts`
- Modify: `components/result-card.tsx:28-29`
- Modify: `components/event-card.tsx:19-20`
- Modify: `app/profile/[id]/page.tsx:143-144`
- Modify: `app/events/[slug]/page.tsx:151-152`

**Step 1: Add the helper to `lib/utils.ts`**

Append after the `cn` function:

```ts
export function isExternalImage(src: string | null | undefined): boolean {
  return !!(src && (src.startsWith("http://") || src.startsWith("https://")));
}
```

**Step 2: Update `components/result-card.tsx`**

Remove the local `isExternalImage` definition (lines 28-29) and add import:

```ts
import { cn, isExternalImage } from "@/lib/utils";
```

(The existing `import ... from "@/lib/utils"` may not exist yet — add it or update if it does.)

**Step 3: Update `components/event-card.tsx`**

Same as step 2 — remove local definition, import from utils.

**Step 4: Update `app/profile/[id]/page.tsx`**

Remove local definition, add to imports:
```ts
import { isExternalImage } from "@/lib/utils";
```

**Step 5: Update `app/events/[slug]/page.tsx`**

Same — remove local definition, add import.

**Step 6: Verify**

```bash
cd /Users/loki/ai && bun lint
```

Expected: no new errors.

**Step 7: Commit**

```bash
git add lib/utils.ts components/result-card.tsx components/event-card.tsx app/profile/[id]/page.tsx app/events/[slug]/page.tsx
git commit -m "refactor: extract isExternalImage helper to lib/utils"
```

---

## Task 2: Configure Next.js Image Optimization for Supabase Storage

**Files:**
- Modify: `next.config.ts`
- Modify: `app/result/[id]/edit/page.tsx:221` (remove complex inline check)

**Background:** Supabase storage URLs follow the pattern `https://<ref>.supabase.co/storage/v1/object/public/...`. After adding this to `remotePatterns`, Next.js can optimize these images (WebP, resizing, lazy load). The `unoptimized` prop on `<Image>` components that source from Supabase can then be simplified — we only need `unoptimized` for truly unknown external domains.

**Step 1: Update `next.config.ts`**

```ts
import type { NextConfig } from "next";

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

export default nextConfig;
```

**Step 2: Update `app/result/[id]/edit/page.tsx`**

Find line ~221 where the `<Image>` has:
```tsx
unoptimized={!!(result.header_image && (result.header_image.startsWith("http://") || result.header_image.startsWith("https://")))}
```

Replace with the shared helper (add import `isExternalImage` from `@/lib/utils`):
```tsx
unoptimized={isExternalImage(result.header_image)}
```

**Note:** `isExternalImage` returning `true` for Supabase URLs is still correct for now — Supabase images uploaded by users are served from the configured hostname and will benefit from `remotePatterns`. However, the `unoptimized` flag on Supabase images is no longer required after this config. If desired, a follow-up could add `isSupabaseStorageUrl` to remove `unoptimized` entirely for those images. For now, simplifying the inline expression is the goal.

**Step 3: Verify**

```bash
bun lint && bun build
```

Expected: build succeeds. If Next.js throws "hostname not configured" for any image URL, add the missing hostname to `remotePatterns`.

**Step 4: Commit**

```bash
git add next.config.ts app/result/[id]/edit/page.tsx
git commit -m "feat: configure Next.js image optimization for Supabase storage"
```

---

## Task 3: Server-side Redirect for `/account`

**Files:**
- Modify: `app/account/page.tsx`

**Background:** Currently a client component that renders a spinner then calls `router.replace()` in `useEffect`. This creates a flash-of-spinner on every `/account` visit. Server components can call Next.js `redirect()` before sending any HTML.

**Step 1: Replace `app/account/page.tsx`**

```tsx
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  redirect(`/profile/${user.id}`);
}
```

**Note:** No `"use client"` directive. No imports for `useEffect`, `useRouter`, or `Loader2` needed.

**Step 2: Verify**

```bash
bun lint && bun build
```

**Step 3: Manual test**

- Visit `/account` while logged out → should redirect to `/login` with no spinner flash
- Visit `/account` while logged in → should redirect to `/profile/[your-id]` instantly

**Step 4: Commit**

```bash
git add app/account/page.tsx
git commit -m "perf: replace client-side account redirect with server redirect"
```

---

## Task 4: Tag Toggle — Parallel Round Trips

**Files:**
- Modify: `app/result/[id]/edit/page.tsx` — `handleTagToggle` function (~lines 110-126)

**Background:** Currently DELETE runs first, then INSERT. They're sequential (~400ms total). Since the DELETE is "clear all tags for this result" and INSERT adds the new one, they're independent operations that can run concurrently.

**Step 1: Update `handleTagToggle`**

Find the current `handleTagToggle` function and replace:

```ts
const handleTagToggle = async (tagId: string) => {
  if (isSavingTags) return;
  setIsSavingTags(true);

  if (assignedTagIds.has(tagId)) {
    // Deselect: remove this tag
    await supabase.from("result_tags").delete().eq("result_id", id).eq("tag_id", tagId);
    setAssignedTagIds(new Set());
  } else {
    // Single-select: clear all existing, then add new one — run in parallel
    await Promise.all([
      supabase.from("result_tags").delete().eq("result_id", id),
      supabase.from("result_tags").insert({ result_id: id, tag_id: tagId }),
    ]);
    setAssignedTagIds(new Set([tagId]));
  }

  setIsSavingTags(false);
};
```

**Step 2: Verify**

```bash
bun lint
```

**Step 3: Commit**

```bash
git add app/result/[id]/edit/page.tsx
git commit -m "perf: parallelize tag toggle delete+insert round trips"
```

---

## Task 5: Event Detail — Reduce Query Count via Join

**Files:**
- Modify: `app/events/[slug]/page.tsx` — `fetchResults` function and `ResultWithMeta` mapping

**Background:** Currently `fetchResults` fires 3 queries:
1. `results` where `event_id = X`
2. `profiles` where `id IN (author_ids)`
3. `teams` where `id IN (team_ids)`

Supabase supports foreign table joins in `select()`. Using `profiles!author_id(display_name)` and `teams!team_id(name)` collapses this to 1 query.

**Step 1: Update `fetchResults` in `app/events/[slug]/page.tsx`**

Find the current `fetchResults` callback and replace the body:

```ts
const fetchResults = useCallback(async (eventId: string) => {
  type ResultRow = Result & {
    profiles: { display_name: string | null } | null;
    teams: { name: string } | null;
  };

  const query = supabase
    .from("results")
    .select("*, profiles!author_id(display_name), teams!team_id(name)")
    .eq("event_id", eventId)
    .order("pinned", { ascending: false })
    .order("date", { ascending: false });
  if (!isAdmin) query.eq("status", "published");

  const { data } = await query;
  const rows = (data as ResultRow[]) || [];

  setResults(
    rows.map((r) => ({
      ...r,
      author_name: r.profiles?.display_name ?? null,
      team_name: r.teams?.name ?? null,
    }))
  );
}, [supabase, isAdmin]);
```

Remove the now-unused `authorIds`, `teamIds`, `profilesRes`, `teamsRes`, `profileMap`, `teamMap` variables (they were all inside the old function body).

**Step 2: Verify TypeScript compiles**

```bash
bun lint && bun build
```

If Supabase's TypeScript types complain about the join syntax (since types are auto-generated and may not reflect the runtime join), cast `data` to `ResultRow[]` as shown above.

**Step 3: Commit**

```bash
git add app/events/[slug]/page.tsx
git commit -m "perf: replace 3-query result fetch with single join query"
```

---

## Task 6: Header Pinned Events as Server Prop

**Files:**
- Modify: `app/layout.tsx`
- Modify: `components/header.tsx`

**Background:** `Header` fetches pinned events in `useEffect`, firing a client-side DB request on every page. Since pinned events are public data, they can be fetched server-side in `layout.tsx` and passed as a prop.

**Note:** The layout uses the server Supabase client (no user session), so we always fetch only `status = 'published'` pinned events. Draft pinned events remain visible to admins via the `/events` page.

**Step 1: Update `app/layout.tsx`**

Add the server fetch and pass `pinnedEvents` prop:

```tsx
import "@/app/globals.css";
import { AuthProvider } from "@/components/auth-provider";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { Toaster } from "@/components/ui/sonner";
import { createClient } from "@/lib/supabase/server";
import { SquircleNoScript } from "@squircle-js/react";
import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { Noto_Sans, Noto_Sans_Mono } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";

const notoSans = Noto_Sans({ variable: "--font-noto-sans", subsets: ["latin"] });
const notoSansMono = Noto_Sans_Mono({ variable: "--font-noto-sans-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "國立陽明交通大學 人工智慧專責辦公室",
  description: "Office of AI Affairs",
  verification: { google: "vjj3Fw7BmozLkeGrZTCo6PYVVqBhPQG6tTvbQel7fwM" },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const { data: pinnedEvents } = await supabase
    .from("events")
    .select("name, slug")
    .eq("pinned", true)
    .eq("status", "published")
    .order("sort_order", { ascending: true });

  return (
    <html lang="zh-TW" suppressHydrationWarning>
      <body className={`${notoSans.variable} ${notoSansMono.variable} antialiased`}>
        <SquircleNoScript />
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <NuqsAdapter>
            <AuthProvider>
              <div className="relative flex flex-col min-h-dvh">
                <Header pinnedEvents={pinnedEvents ?? []} />
                <div className="flex-1">{children}</div>
                <Footer />
              </div>
              <Toaster />
            </AuthProvider>
          </NuqsAdapter>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

**Step 2: Update `components/header.tsx`**

Add `pinnedEvents` to props and remove the `useEffect` fetch:

```tsx
// 1. Remove these imports (no longer needed for fetch):
//    createClient from "@/lib/supabase/client"  ← remove if only used for pinnedEvents
// 2. Add pinnedEvents to function signature:

export function Header({ pinnedEvents }: { pinnedEvents: { name: string; slug: string }[] }) {
  const { user, profile, isLoading, signOut, isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  // Remove: const [pinnedEvents, setPinnedEvents] = useState(...)
  // Remove: the useEffect that fetches pinnedEvents

  // Keep all other useEffects (keydown, pointerdown outside click)
  // Rest of the component is unchanged
```

**Step 3: Verify**

```bash
bun lint && bun build
```

**Step 4: Commit**

```bash
git add app/layout.tsx components/header.tsx
git commit -m "perf: fetch pinned events server-side in layout instead of client useEffect"
```

---

## Task 7: Home Sections → Server Components

This is the largest change. Complete each section independently — each is a standalone commit.

### Task 7a: `HomeIntroduction` → Server Component

**Files:**
- Modify: `components/home-introduction.tsx`

**Background:** No admin UI on this section. Pure data display. Safe to fully convert.

**Step 1: Rewrite `components/home-introduction.tsx`**

```tsx
import { createClient } from "@/lib/supabase/server";
import { generateText } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export async function HomeIntroduction() {
  const supabase = await createClient();
  const { data: introduction } = await supabase
    .from("introduction")
    .select("*")
    .single();

  const contentText =
    introduction?.content && Object.keys(introduction.content).length > 0
      ? generateText(introduction.content, [StarterKit])
      : "";

  const truncatedText =
    contentText.length > 150 ? contentText.slice(0, 150) + "..." : contentText;

  return (
    <div className="bg-muted/40 py-20 px-4">
      <div className="max-w-3xl mx-auto flex flex-col items-center gap-6 text-center">
        <h2 className="text-3xl font-bold">
          {introduction?.title || "國立陽明交通大學人工智慧專責辦公室"}
        </h2>
        {truncatedText && (
          <p className="text-lg text-muted-foreground leading-relaxed">
            {truncatedText}
          </p>
        )}
        <Link href="/introduction">
          <Button variant="secondary" size="lg" className="px-12 text-lg mt-2">
            探索更多
          </Button>
        </Link>
      </div>
    </div>
  );
}
```

**No `"use client"` directive. No `useState`, no `useEffect`, no `Loader2`.**

**Step 2: Verify**

```bash
bun lint && bun build
```

**Step 3: Commit**

```bash
git add components/home-introduction.tsx
git commit -m "perf: convert HomeIntroduction to server component"
```

---

### Task 7b: `HomeAnnouncement` → Server Component

**Files:**
- Create: `components/home-announcement-table.tsx` (new thin client wrapper)
- Modify: `components/home-announcement.tsx`

**Background:** `AnnouncementTable` requires `onRowClick: (item) => void`, which is a function — can't cross the server/client boundary as a prop. Solution: create a thin `HomeAnnouncementTable` client component that owns the router and wraps `AnnouncementTable`.

**Step 1: Create `components/home-announcement-table.tsx`**

```tsx
"use client";

import { AnnouncementTable } from "@/components/announcement-table";
import type { Announcement } from "@/lib/supabase/types";
import { useRouter } from "next/navigation";

export function HomeAnnouncementTable({
  announcements,
}: {
  announcements: Announcement[];
}) {
  const router = useRouter();
  return (
    <AnnouncementTable
      announcements={announcements}
      onRowClick={(item) => router.push(`/announcement/${item.id}`)}
    />
  );
}
```

**Step 2: Rewrite `components/home-announcement.tsx`**

```tsx
import { HomeAnnouncementTable } from "@/components/home-announcement-table";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export async function HomeAnnouncement() {
  const supabase = await createClient();
  const { data: announcements } = await supabase
    .from("announcements")
    .select("*")
    .eq("status", "published")
    .is("event_id", null)
    .order("date", { ascending: false })
    .limit(5);

  return (
    <div className="container max-w-6xl mx-auto py-16 px-4 flex flex-col gap-8">
      <h2 className="text-2xl font-bold border-l-4 border-primary pl-3">最新公告</h2>
      {!announcements || announcements.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">目前沒有公告</div>
      ) : (
        <HomeAnnouncementTable announcements={announcements} />
      )}
      <div className="flex justify-center">
        <Link href="/announcement">
          <Button variant="secondary" size="lg" className="px-12 text-lg">
            探索更多
          </Button>
        </Link>
      </div>
    </div>
  );
}
```

**Step 3: Verify**

```bash
bun lint && bun build
```

**Step 4: Commit**

```bash
git add components/home-announcement.tsx components/home-announcement-table.tsx
git commit -m "perf: convert HomeAnnouncement to server component"
```

---

### Task 7c: `HomeEvents` → Server Component

**Files:**
- Modify: `components/home-events.tsx`

**Background:** No admin UI. Grid of event cards linked to `/events/[slug]`. Pure display — fully convertible.

**Step 1: Rewrite `components/home-events.tsx`**

```tsx
import { EventCard } from "@/components/event-card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import type { Event } from "@/lib/supabase/types";
import Link from "next/link";

export async function HomeEvents() {
  const supabase = await createClient();
  const { data: events } = await supabase
    .from("events")
    .select("*")
    .eq("status", "published")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(6);

  return (
    <div className="container max-w-6xl mx-auto py-16 px-4 flex flex-col gap-8">
      <h2 className="text-2xl font-bold border-l-4 border-primary pl-3">活動專區</h2>
      {!events || events.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">目前沒有活動</div>
      ) : (
        <div className="grid lg:grid-cols-3 md:grid-cols-2 grid-cols-1 gap-6">
          {(events as Event[]).map((item) => (
            <Link href={`/events/${item.slug}`} key={item.id} className="h-full">
              <EventCard item={item} />
            </Link>
          ))}
        </div>
      )}
      <div className="flex justify-center">
        <Link href="/events">
          <Button variant="secondary" size="lg" className="px-12 text-lg">
            探索更多
          </Button>
        </Link>
      </div>
    </div>
  );
}
```

**Step 2: Verify**

```bash
bun lint && bun build
```

**Step 3: Commit**

```bash
git add components/home-events.tsx
git commit -m "perf: convert HomeEvents to server component"
```

---

### Task 7d: `HomeContacts` → Server Component + `ContactsEditButton`

**Files:**
- Create: `components/contacts-edit-button.tsx` (new thin client wrapper for admin button)
- Modify: `components/home-contacts.tsx`

**Background:** The `isAdmin` check for the "編輯聯絡資訊" button requires `useAuth()`, which is client-only. Extract just that button into a client component.

**Step 1: Create `components/contacts-edit-button.tsx`**

```tsx
"use client";

import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function ContactsEditButton() {
  const { isAdmin } = useAuth();
  if (!isAdmin) return null;
  return (
    <Button variant="secondary" size="sm" asChild className="h-8 px-3">
      <Link href="/contacts">編輯聯絡資訊</Link>
    </Button>
  );
}
```

**Step 2: Rewrite `components/home-contacts.tsx`**

```tsx
import { ContactsEditButton } from "@/components/contacts-edit-button";
import { createClient } from "@/lib/supabase/server";
import type { Contact } from "@/lib/supabase/types";
import { Mail, Phone } from "lucide-react";

const FALLBACK_CONTACT: Contact = {
  id: "fallback",
  created_at: "",
  updated_at: "",
  name: "AI Office",
  position: null,
  phone: "0987654321",
  email: "ai@winlab.tw",
  sort_order: 0,
};

export async function HomeContacts() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("contacts")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  const rows = data && data.length > 0 ? (data as Contact[]) : [FALLBACK_CONTACT];

  return (
    <div className="container max-w-6xl mx-auto py-16 px-4">
      <div className="flex flex-col lg:flex-row gap-12 items-center lg:items-start justify-between">
        <div className="flex flex-col gap-3 w-full lg:w-auto">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold border-l-4 border-primary pl-3">聯絡我們</h2>
            <ContactsEditButton />
          </div>
        </div>
        <div className="flex flex-col gap-8 shrink-0 w-full max-w-md mx-auto lg:mx-0 items-center lg:items-start text-center lg:text-left">
          {rows.map((c) => (
            <div key={c.id} className="flex flex-col gap-2 items-center lg:items-start">
              <div>
                <p className="text-lg font-semibold">{c.name}</p>
                {c.position && <p className="text-muted-foreground">{c.position}</p>}
              </div>
              {c.phone && (
                <div className="flex items-center gap-3 text-muted-foreground justify-center lg:justify-start">
                  <Phone className="w-4 h-4 shrink-0 text-muted-foreground" />
                  <a href={`tel:${c.phone}`} className="hover:text-foreground transition-colors font-mono break-all">
                    {c.phone}
                  </a>
                </div>
              )}
              {c.email && (
                <div className="flex items-center gap-3 text-muted-foreground justify-center lg:justify-start">
                  <Mail className="w-4 h-4 shrink-0 text-muted-foreground" />
                  <a href={`mailto:${c.email}`} className="hover:text-foreground transition-colors font-mono break-all">
                    {c.email}
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

**Step 3: Verify**

```bash
bun lint && bun build
```

**Step 4: Commit**

```bash
git add components/home-contacts.tsx components/contacts-edit-button.tsx
git commit -m "perf: convert HomeContacts to server component"
```

---

### Task 7e: `HomeCarousel` → Server Component + `CarouselClient`

**Files:**
- Create: `components/carousel-client.tsx` (new — all embla, admin button, interactivity)
- Modify: `components/home-carousel.tsx` (becomes server component, fetches slides, renders CarouselClient)

**Background:** The carousel interaction (autoplay, prev/next, indicators) requires embla-carousel which is client-only. The data fetch and empty-state logic can move to the server. Split: server fetches slides → passes to `CarouselClient` as prop.

**Step 1: Create `components/carousel-client.tsx`**

Extract all the current JSX and client logic from `home-carousel.tsx` into this file:

```tsx
"use client";

import {
  Carousel,
  CarouselContent,
  CarouselIndicators,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { useAuth } from "@/components/auth-provider";
import type { CarouselSlide } from "@/lib/supabase/types";
import Autoplay from "embla-carousel-autoplay";
import { ChevronLeft, ChevronRight, Pencil } from "lucide-react";
import Link from "next/link";
import * as React from "react";

export function CarouselClient({ slides }: { slides: CarouselSlide[] }) {
  const { isAdmin } = useAuth();

  const plugin = React.useRef(
    Autoplay({ delay: 5000, stopOnInteraction: true })
  );

  if (slides.length === 0) {
    if (isAdmin) {
      return (
        <div className="max-w-6xl mx-auto px-4 py-8">
          <Link
            href="/carousel"
            className="inline-flex items-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 px-4 py-6 w-full justify-center text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors"
          >
            <Pencil className="w-5 h-5" />
            尚無橫幅，點此新增首頁輪播
          </Link>
        </div>
      );
    }
    return (
      <div className="w-full max-w-6xl mx-auto relative">
        <div className="relative w-full aspect-video min-h-[200px] bg-muted">
          <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground px-4">
            <p className="text-base md:text-lg font-medium">國立陽明交通大學 人工智慧專責辦公室</p>
            <p className="text-sm mt-1">歡迎來到 AI Office</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto relative">
      {isAdmin && (
        <Link
          href="/carousel"
          className="absolute top-3 right-3 z-10 inline-flex items-center gap-1.5 rounded-md bg-black/50 px-3 py-1.5 text-sm font-medium text-white hover:bg-black/70 transition-colors"
        >
          <Pencil className="w-3.5 h-3.5" />
          編輯橫幅
        </Link>
      )}
      <Carousel
        plugins={[plugin.current]}
        className="w-full relative group"
        onMouseEnter={plugin.current.stop}
        onMouseLeave={plugin.current.reset}
        opts={{ loop: true }}
      >
        <CarouselContent className="ml-0">
          {slides.map((slide) => {
            const isExternal =
              slide.link?.startsWith("http://") || slide.link?.startsWith("https://");
            const slideContent = (
              <>
                <div
                  className="absolute inset-0 bg-cover bg-center bg-no-repeat bg-muted"
                  style={{ backgroundImage: `url(${slide.image || "/placeholder.png"})` }}
                />
                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-black/60 to-transparent" />
                <div className="absolute inset-0 flex flex-col items-center justify-end text-white px-4 md:px-8 pb-12 md:pb-16 pointer-events-none">
                  <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-center mb-3">
                    {slide.title}
                  </h2>
                  {slide.description && (
                    <span className="inline-block text-xs md:text-sm lg:text-base text-center max-w-3xl">
                      {slide.description}
                    </span>
                  )}
                </div>
              </>
            );
            return (
              <CarouselItem key={slide.id} className="pl-0">
                {slide.link ? (
                  <a
                    href={slide.link}
                    className="relative block w-full aspect-video min-h-[200px] cursor-pointer"
                    {...(isExternal && { target: "_blank", rel: "noopener noreferrer" })}
                  >
                    {slideContent}
                  </a>
                ) : (
                  <div className="relative block w-full aspect-video min-h-[200px]">
                    {slideContent}
                  </div>
                )}
              </CarouselItem>
            );
          })}
        </CarouselContent>
        <CarouselPrevious
          variant="ghost"
          className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 h-10 w-10 md:h-12 md:w-12 rounded-full bg-black/30 hover:bg-black/50 text-white border-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        >
          <ChevronLeft className="h-6 w-6 md:h-8 md:w-8" />
        </CarouselPrevious>
        <CarouselNext
          variant="ghost"
          className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 h-10 w-10 md:h-12 md:w-12 rounded-full bg-black/30 hover:bg-black/50 text-white border-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        >
          <ChevronRight className="h-6 w-6 md:h-8 md:w-8" />
        </CarouselNext>
        <CarouselIndicators className="absolute bottom-4 md:bottom-6 left-1/2 -translate-x-1/2" />
      </Carousel>
    </div>
  );
}
```

**Step 2: Rewrite `components/home-carousel.tsx`**

```tsx
import { CarouselClient } from "@/components/carousel-client";
import { createClient } from "@/lib/supabase/server";
import type { CarouselSlide } from "@/lib/supabase/types";

export async function HomeCarousel() {
  const supabase = await createClient();
  const { data: slides } = await supabase
    .from("carousel_slides")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  return <CarouselClient slides={(slides as CarouselSlide[]) ?? []} />;
}
```

**Step 3: Verify**

```bash
bun lint && bun build
```

**Step 4: Commit**

```bash
git add components/home-carousel.tsx components/carousel-client.tsx
git commit -m "perf: convert HomeCarousel to server component, extract CarouselClient"
```

---

## Final Verification

After all tasks, verify the complete build and do a manual smoke test:

```bash
bun build
bun start
```

Check:
- Homepage loads with content visible immediately (no spinners)
- Header shows pinned events
- Carousel works (autoplay, prev/next)
- `/account` redirects without spinner
- Admin edit buttons appear when logged in as admin
- Tag toggle works on result edit page
- Event detail page loads (check browser network tab — results should show 1 fetch instead of 3)
