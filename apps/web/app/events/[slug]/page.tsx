import { permanentRedirect, redirect } from "next/navigation";
import { EventDetailNotFoundClient } from "./not-found-client";
import { getEventPageData } from "./data";
import type { EventTab } from "./client";

// MCP server writes directly to Supabase, bypassing Next.js Server Actions and
// updateTag(). Force dynamic rendering so admin edits made through MCP show up
// on the next visit instead of waiting for the 1h ISR fallback.
export const dynamic = "force-dynamic";

const VALID_TABS: readonly EventTab[] = ["announcements", "results", "recruitment", "members"];
const DEFAULT_TAB: EventTab = "results";

// /events/[slug] is the legacy entry point for the four tabbed listings
// (announcements / results / recruitment / members). It now redirects to the
// default tab so each listing has its own URL + metadata for SEO (issue #1).
//
// Backward compat: the previous URL shape was /events/[slug]?tab=<tab>, so
// we honor a ?tab query param to keep old inbound links working — a 307
// rather than a permanent redirect because the query is the caller's
// hint, not a canonical form.
export default async function EventDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const { slug } = await params;
  const { tab } = await searchParams;
  const data = await getEventPageData(slug);

  if (!data) {
    return <EventDetailNotFoundClient slug={slug} />;
  }

  const rawTab = Array.isArray(tab) ? tab[0] : tab;
  if (rawTab && (VALID_TABS as readonly string[]).includes(rawTab)) {
    redirect(`/events/${slug}/${rawTab}`);
  }

  permanentRedirect(`/events/${slug}/${DEFAULT_TAB}`);
}
