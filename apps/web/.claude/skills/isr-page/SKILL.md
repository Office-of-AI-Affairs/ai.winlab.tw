---
name: isr-page
description: Use when adding a new public-facing page on ai.winlab.tw, refactoring an existing dynamic (ƒ) route into static (○/●), wiring an admin edit flow to invalidate cache tags, or debugging why a page won't go static. Triggers on "ISR", "static page", "unstable_cache", "updateTag", "revalidateTag", "createPublicClient", "cache tag", "public page", "cookieless", "data.ts", "actions.ts", "draft merge".
---

# ISR / SSG pattern — ai.winlab.tw

Public pages render statically against Supabase while still reflecting admin mutations within a second. The whole tree is cookieless by default; auth is hydrated client-side via `AuthProvider`, so a single cookie read on the root layout would poison every downstream page into `ƒ Dynamic`.

## When this skill applies

- Adding a new visitor-facing route that should land as `○ Static` or `●` in `bun run build`.
- Wiring a new admin edit hook to invalidate the right cache tag(s).
- Diagnosing why a page is `ƒ Dynamic` when you expected `○`.
- Reviewing whether an admin mutation calls the right revalidator.

## Four-piece pattern

Every public page follows this layout. `app/events/` is the canonical reference:

```
app/<route>/
├── page.tsx       # server, cookieless, imports from ./data
├── data.ts        # unstable_cache + createPublicClient
├── actions.ts     # "use server" updateTag helpers
└── client.tsx     # "use client", reads useAuth, draft merge

app/<route>/[param]/
├── page.tsx       # generateStaticParams + per-row data
├── data.ts
├── actions.ts
├── client.tsx
└── not-found-client.tsx   # admin shortcut to draft / 404 fallback
```

### 1. `page.tsx` — dumb shell

No auth reads. Calls cached fetchers, hands payload to `client.tsx`. Param routes add `generateStaticParams`:

```tsx
export default async function EventsPage() {
  const publishedEvents = await getPublishedEvents();
  return <EventsPageClient publishedEvents={publishedEvents} />;
}
```

### 2. `data.ts` — cookieless + cached

```ts
import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";

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

`createPublicClient` uses the publishable key **without** cookies. RLS gates anything `authenticated`-only out, so cached payloads only ever contain visitor-safe data. Admin drafts merge in client-side via `useAuth`.

### 3. `actions.ts` — Server Action invalidators

```ts
"use server";
import { updateTag } from "next/cache";
export async function revalidateEvents() { updateTag("events-published"); }
```

Use `updateTag`, not `revalidateTag`. Next 16's `updateTag` gives "read-your-own-writes" semantics inside a Server Action so the admin sees fresh data on the next render without a race.

### 4. `client.tsx` — admin UI + draft merge

```tsx
"use client";
import { useAuth } from "@/components/auth-provider";

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

## Cache tag inventory

| Tag                       | Invalidated by                                   |
|---------------------------|--------------------------------------------------|
| `pinned-events`           | event save / publish / delete                    |
| `events-published`        | event mutation of any kind                       |
| `announcements-published` | announcement save / publish / delete             |
| `carousel-slides`         | carousel CRUD + reorder                          |
| `contacts`                | contacts CRUD                                    |
| `introduction`            | introduction edit save                           |
| `organization-members`    | org member CRUD (dialog + edit page)             |
| `privacy`                 | privacy version publish (inline view+edit route) |

`app/events/actions.ts` exports `revalidateAllEventCaches()` that drops both `pinned-events` and `events-published` — use it for any event-scoped mutation inside `/events/[slug]/*`.

## Wiring a mutation to a tag

`useContentEditor`, `useDialogForm`, `useCrudList` all accept `onAfter*` callbacks:

```tsx
useContentEditor({
  // …
  onAfterSave: revalidateEvents,
  onAfterPublish: revalidateEvents,
  onAfterRemove: revalidateEvents,
});
```

If a mutation touches multiple caches, call multiple actions or build a combined one (see `revalidateAllEventCaches`). When in doubt, over-invalidate — the WinLab traffic profile makes one or two extra cache recomputations per mutation negligible.

## Adding a new public page

1. `app/<route>/data.ts` — `unstable_cache(reader, ["<tag>"], { tags: ["<tag>"], revalidate: 3600 })`
2. `app/<route>/actions.ts` — `"use server"; updateTag("<tag>")`
3. `app/<route>/page.tsx` — async server component, no cookie reads
4. `app/<route>/client.tsx` — admin UI via `useAuth()`; server output is the public view
5. Wire every edit flow that touches this route's data to the action
6. Update `lib/app/server-admin-pages.test.ts` — add the route to the cached-public-pages loop
7. Run `bun run build` — confirm route shows `○` or `●`, not `ƒ`

## Detail routes — `generateStaticParams`

```ts
export async function generateStaticParams() {
  const ids = await getPublishedAnnouncementIds();
  return ids.map((id) => ({ id }));
}
```

New params created after a deploy hit ISR fallback: first request renders on demand, subsequent requests serve from the edge. See `app/announcement/[id]` and `app/events/[slug]` for two different shapes.

## Drafts on detail routes

A published-only server cache can't serve a draft. For routes where an admin may land on a draft URL, render a client "not-found" that detects admin and offers an editor shortcut:

```tsx
const data = await getEventPageData(slug);
if (!data) return <EventDetailNotFoundClient slug={slug} />;
```

`EventDetailNotFoundClient` reads `useAuth().isAdmin` and conditionally shows "open editor". Public visitors get a clean 404, admins get a fast path to their draft.

## When `?mode=edit` (or any nuqs `useQueryState`) lives in client.tsx

`useSearchParams` requires a `<Suspense>` boundary at the static prerender boundary. The project convention is to use the implicit Suspense from a route-level `loading.tsx`. Without it, build fails with `useSearchParams() should be wrapped in a suspense boundary at page "/<route>"`. See `/privacy` for the canonical example (loading.tsx mirrors the page layout's title + body skeleton).

## Trade-offs (priced in)

- **Auth flash**: admins see ~300ms of logged-out header on cold navigation while `AuthProvider` hydrates from browser session. Worth it for a mostly-anonymous visitor site.
- **Admin drafts arrive after hydration**: the draft merge is a client effect, so a brief moment shows only published items. Current pages aren't draft-heavy.
- **Cross-tag invalidation**: intentionally over-invalidate to keep the mental model small.

## Current pages on the pattern

| Route               | Build marker | Tags |
|---------------------|--------------|------|
| `/`                 | `○`          | `pinned-events`, `events-published`, `announcements-published`, `carousel-slides`, `contacts`, `introduction`, `organization-members` |
| `/introduction`     | `○`          | `introduction`, `organization-members` |
| `/announcement`     | `○`          | `announcements-published` |
| `/events`           | `○`          | `events-published`, `pinned-events` |
| `/privacy`          | `○`          | `privacy` (inline view+edit, see `inline-view-edit` skill) |
| `/announcement/[id]`| `●`          | `announcements-published` |
| `/events/[slug]`    | `ƒ`          | (none — see below) |

Non-public routes (admin editor, `/account`, `/profile/[id]`, `/settings/*`) intentionally stay `ƒ` — user-specific, cache-share doesn't apply.

`/events/[slug]` is the one public exception running `ƒ Dynamic`: the recruitment data is mutated by the sibling MCP server (`~/mcp.ai.winlab.tw`) which writes Supabase directly and bypasses the Server Action `updateTag()` flow. Adding a `/api/revalidate` webhook would break the "no API routes" convention, so this page reads on every request. Traffic is low enough that the extra Supabase egress is acceptable.

## Contract tests

`lib/app/server-admin-pages.test.ts` codifies the pattern so drift is caught on CI:

- Public pages must not import `@/lib/supabase/get-viewer` or `@/lib/supabase/server`
- They must import from `./data`
- Their `data.ts` must declare `tags: [...]` and import from `@/lib/supabase/public`

Add new pages to the cached-public-pages loop when you add them.

## Related skills

- `inline-view-edit` — when admin edit shouldn't live on a separate `/edit` route
- `rls-permissions` — when the new page reads tables you need to verify the policies on
