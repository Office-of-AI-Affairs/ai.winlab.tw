import type { SearchResultRow } from "./types";

/**
 * Canonical bare (un-localized) path for a `search_site()` row. The RPC
 * already denormalizes `slug`/`event_slug` server-side, so unlike
 * `app/sitemap.ts` this doesn't need a separate event-id -> slug lookup.
 *
 * Mirrors the canonical URL shapes used elsewhere (`app/sitemap.ts`,
 * `app/[locale]/announcement/rss.xml/route.ts`): announcements route on
 * slug (event-scoped when `event_slug` is set, else the global
 * `/announcement/[slug]`); results have no slug column and no global list,
 * so they always need an `event_slug`; events route on their own slug.
 */
export function searchResultPath(row: SearchResultRow): string {
  switch (row.type) {
    case "announcement":
      return row.event_slug
        ? `/events/${row.event_slug}/announcements/${encodeURIComponent(row.slug ?? "")}`
        : `/announcement/${encodeURIComponent(row.slug ?? "")}`;
    case "event":
      return `/events/${row.slug ?? ""}`;
    case "result":
      // Published results are always event-scoped (no global results list),
      // so event_slug should always be present; /events is a safe fallback
      // if a future event-less result type ever slips through.
      return row.event_slug ? `/events/${row.event_slug}/results/${row.id}` : "/events";
  }
}
