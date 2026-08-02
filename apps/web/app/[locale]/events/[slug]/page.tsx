import { redirect } from "next/navigation";
import { EventDetailNotFoundClient } from "./not-found-client";
import { getEventPageData, type EventPagePayload } from "./data";
import type { EventTab } from "./client";
import { defaultLocale, isLocale, type Locale } from "@/lib/i18n/config";
import { localizedPath } from "@/lib/i18n/routing";

// MCP server writes directly to Supabase, bypassing Next.js Server Actions and
// updateTag(). Force dynamic rendering so admin edits made through MCP show up
// on the next visit instead of waiting for the 1h ISR fallback.
export const dynamic = "force-dynamic";

const VALID_TABS: readonly EventTab[] = ["announcements", "results", "recruitment", "members"];
const DEFAULT_TAB: EventTab = "results";

// Landing tab when the caller didn't ask for one. A fixed "results" strands
// events that hold no results (e.g. a recordings event whose only content is
// announcements) on an empty tab, so fall through to the first tab that has
// something in it. "results" stays at the head of the order to preserve the
// previous landing spot for events that do have results. `members` is
// excluded — it's a roster, not a listing anyone should land on.
const LANDING_TAB_ORDER: readonly EventTab[] = ["results", "announcements", "recruitment"];

function resolveLandingTab(data: EventPagePayload): EventTab {
  const counts: Record<string, number> = {
    results: data.results.length,
    announcements: data.announcements.length,
    recruitment: data.recruitments.length,
  };
  return LANDING_TAB_ORDER.find((t) => counts[t] > 0) ?? DEFAULT_TAB;
}

// /events/[slug] is the legacy entry point for the four tabbed listings
// (announcements / results / recruitment / members). It now redirects to the
// landing tab so each listing has its own URL + metadata for SEO (issue #1).
//
// Backward compat: the previous URL shape was /events/[slug]?tab=<tab>, so
// we honor a ?tab query param to keep old inbound links working — a 307
// rather than a permanent redirect because the query is the caller's
// hint, not a canonical form.
export default async function EventDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; locale: string }>;
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const { slug, locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : defaultLocale;
  const { tab } = await searchParams;
  const data = await getEventPageData(slug);

  if (!data) {
    return <EventDetailNotFoundClient slug={slug} />;
  }

  const rawTab = Array.isArray(tab) ? tab[0] : tab;
  if (rawTab && (VALID_TABS as readonly string[]).includes(rawTab)) {
    redirect(localizedPath(`/events/${slug}/${rawTab}`, locale));
  }

  // 307, not permanent: the landing tab depends on which listings currently
  // have content, so it must not be cached by the browser as canonical.
  redirect(localizedPath(`/events/${slug}/${resolveLandingTab(data)}`, locale));
}
