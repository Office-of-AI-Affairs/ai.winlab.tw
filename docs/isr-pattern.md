# ISR / SSG pattern

How public-facing pages on `ai.winlab.tw` render statically against a
Supabase backend while still reflecting admin mutations within a second.

## Why

Supabase free-tier egress was bleeding because every pageview hit the DB.
The original layout pulled `supabase.auth.getUser()` in a server component,
which turns every downstream page dynamic — even a `revalidate = 3600`
export on `/privacy` never cached because the route tree was poisoned by
a cookie read. The pattern documented here made the full tree cookieless
by default and only pulled auth in from the client.

## Four-piece pattern

Every public page that wants to be `○` or `●` in the build output follows
the same four-file layout. `/events` is the canonical example:

```
app/events/
├── page.tsx       # server component, no cookies, imports from ./data
├── data.ts        # unstable_cache'd readers using createPublicClient
├── actions.ts     # "use server" updateTag helpers
├── client.tsx     # "use client", pulls isAdmin/user from useAuth
└── [slug]/
    ├── page.tsx
    ├── data.ts
    ├── actions.ts
    ├── client.tsx
    └── not-found-client.tsx   # draft / 404 fallback with admin shortcut
```

### 1. `page.tsx` — the dumb shell

Calls cached fetchers, hands the payload to a client wrapper. No auth
reads. Any admin-only UI moves to the client component.

```tsx
export default async function EventsPage() {
  const publishedEvents = await getPublishedEvents();
  return <EventsPageClient publishedEvents={publishedEvents} />;
}
```

Param routes add `generateStaticParams` to prerender what we know at
build time; unknown slugs fall through to ISR fallback on first request.

### 2. `data.ts` — cookieless + cached

Every reader is `unstable_cache`'d with:

- a **cache key array** that starts with a human-readable string
- a **tags array** — multiple entries allowed so one `updateTag` call can
  invalidate several variants
- `revalidate: 3600` — the 1h fallback when nothing explicit invalidates

```ts
export const getPublishedEvents = unstable_cache(
  async () => {
    const sb = createPublicClient();
    const { data } = await sb.from("events").select("*").eq("status", "published");
    return data ?? [];
  },
  ["events-published"],
  { tags: ["events-published"], revalidate: 3600 },
);
```

The client is `createPublicClient` from `lib/supabase/public.ts`, which
uses the publishable key **without** cookies. That's the critical bit —
RLS policies that gate data to `authenticated` will reject these reads,
so the cached payload can only contain data that's safe to serve to
everyone. Anything user-specific (drafts, private recruitment details,
etc.) is merged in from the client.

### 3. `actions.ts` — Server Action invalidators

One per route family:

```ts
"use server";
import { updateTag } from "next/cache";
export async function revalidateEvents() { updateTag("events-published"); }
```

Why `updateTag` instead of `revalidateTag`: Next.js 16's `updateTag`
gives "read-your-own-writes" semantics from Server Actions, so the admin
who just hit save sees the fresh value on their next render without a
race.

### 4. `client.tsx` — admin UI + draft merge

Reads `isAdmin` / `user` from `useAuth()`. Server-rendered payload is
the public view; the client effect loads admin-only extras via the
authenticated browser client (which goes through RLS, so nothing
sensitive leaks either way).

```tsx
const { isAdmin, user } = useAuth();
useEffect(() => {
  if (!isAdmin) return;
  (async () => {
    const { data } = await sb.from("events").select("*").eq("status", "draft");
    setDrafts(data ?? []);
  })();
}, [isAdmin]);

const events = useMemo(
  () => (isAdmin && drafts.length ? mergeAndSort([...drafts, ...publishedEvents]) : publishedEvents),
  [isAdmin, drafts, publishedEvents],
);
```

## Known cache tags

| Tag                      | Invalidated by                                |
|--------------------------|-----------------------------------------------|
| `pinned-events`          | event save / publish / delete                 |
| `events-published`       | event mutation of any kind                    |
| `announcements-published`| announcement save / publish / delete          |
| `carousel-slides`        | carousel CRUD + reorder                       |
| `contacts`               | contacts CRUD                                 |
| `introduction`           | introduction edit save                        |
| `organization-members`   | org member CRUD (dialog + edit page)          |

`app/events/actions.ts` also exports `revalidateAllEventCaches()` which
drops both `pinned-events` and `events-published` — use that for any
event-scoped mutation inside `/events/[slug]/*`.

## Wiring a mutation to a cache tag

The three edit hooks (`useContentEditor`, `useDialogForm`, `useCrudList`)
all accept `onAfter*` callbacks. Wire the relevant Server Action in:

```tsx
useContentEditor({
  // …
  onAfterSave: revalidateEvents,
  onAfterPublish: revalidateEvents,
  onAfterRemove: revalidateEvents,
});
```

If an edit touches more than one cache, call multiple actions or build a
combined one (see `revalidateAllEventCaches`).

## Adding a new public page

1. `app/<route>/data.ts` — `unstable_cache(reader, ["<tag>"], { tags: ["<tag>"], revalidate: 3600 })`
2. `app/<route>/actions.ts` — `"use server"; updateTag("<tag>")`
3. `app/<route>/page.tsx` — async server component, no cookie reads
4. `app/<route>/client.tsx` — admin UI via `useAuth()`; server-rendered output is the public view
5. Wire every edit flow that touches this route's data to the action
6. Update `lib/app/server-admin-pages.test.ts` — add the route to the cached-public-pages loop

Build and check the page shows as `○` or `●` (not `ƒ`) in `bun run build`.

## Detail routes: `generateStaticParams`

Param routes (`[id]`, `[slug]`) call `generateStaticParams` to prerender
the known set at build time:

```ts
export async function generateStaticParams() {
  const ids = await getPublishedAnnouncementIds();
  return ids.map((id) => ({ id }));
}
```

New params created after a deploy hit the ISR fallback: the first request
renders on demand, goes through the same cached fetchers, subsequent
requests serve from the edge. See `app/announcement/[id]` and
`app/events/[slug]` for two different shapes.

## Drafts on detail routes

A published-only server cache can't serve draft content. For routes
where an admin may land on a draft URL, render a client "not found"
component that detects admin state and offers the editor shortcut:

```tsx
// app/events/[slug]/page.tsx
const data = await getEventPageData(slug);
if (!data) return <EventDetailNotFoundClient slug={slug} />;
```

`EventDetailNotFoundClient` reads `useAuth().isAdmin` and conditionally
shows an "open editor" button. Public visitors get a clean 404, admins
get a fast path to their draft.

## Trade-offs

- **Auth flash**: admins see ~300ms of the logged-out header on cold
  navigation while `AuthProvider` hydrates from the browser session.
  Priced in — worth it for a mostly-anonymous visitor site.
- **Admin drafts arrive after hydration**: the draft merge is a client
  effect, so there's a brief moment where the page shows only published
  items. Current pages aren't draft-heavy so the flash is tolerable.
- **Cross-tag invalidation**: we intentionally over-invalidate
  (`revalidateAllEventCaches` hits two tags instead of just the one
  affected) to keep the mental model small. The cost is one or two
  extra cache recomputations per admin mutation — negligible for the
  WinLab traffic profile.

## Current pages on the pattern

| Route               | Build marker | Tags                                    |
|---------------------|--------------|-----------------------------------------|
| `/`                 | `○`          | `pinned-events`, `events-published`, `announcements-published`, `carousel-slides`, `contacts`, `introduction`, `organization-members` |
| `/introduction`     | `○`          | `introduction`, `organization-members`  |
| `/announcement`     | `○`          | `announcements-published`               |
| `/events`           | `○`          | `events-published`, `pinned-events`     |
| `/privacy`          | `○`          | (no tags — trivial content)             |
| `/announcement/[id]`| `●`          | `announcements-published`               |
| `/events/[slug]`    | `ƒ`          | (none — see note below)                 |

Non-public (admin editor, `/account`, `/profile/[id]`, `/settings/*`)
routes intentionally stay `ƒ` because they're user-specific and the
cache-share model doesn't apply.

`/events/[slug]` is the one public exception that runs `ƒ Dynamic`. The
recruitment data on this page is mutated by the sibling MCP server
(`~/mcp.ai.winlab.tw`), which writes Supabase directly and bypasses the
Server Action `updateTag()` flow that keeps every other ISR page fresh.
Rather than introduce a `/api/revalidate` webhook that breaks the
"no API routes" convention, this page reads on every request. Traffic
is low enough that the extra Supabase egress is acceptable.

## Contract tests

`lib/app/server-admin-pages.test.ts` codifies the pattern so drift is
caught on CI:

- Public pages must not import `@/lib/supabase/get-viewer` or
  `@/lib/supabase/server`
- They must import from `./data`
- Their `data.ts` must declare `tags: [...]` and import from
  `@/lib/supabase/public`

Add new pages to the cached-public-pages loop when you add them.
