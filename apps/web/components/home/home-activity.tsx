import { AppLink } from "@/components/shared/app-link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/date";
import { type Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionary";
import { localizedField } from "@/lib/i18n/localized-field";
import { localizedPath } from "@/lib/i18n/routing";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { liveAnnouncement } from "@/lib/db/filters";
import { announcements, competitions, events as eventsTable, public_profiles, results } from "@/lib/db/schema";
import Link from "next/link";

type ActivityItem = {
  kind: "announcement" | "result" | "recruitment";
  id: string;
  /** Slug for announcements (URL-safe); undefined for results/recruitment,
   *  which are still id-routed. */
  slug?: string;
  title: string;
  eventSlug: string;
  eventName: string;
  createdAt: string;
  authorName?: string | null;
};

function buildHref(item: ActivityItem): string {
  switch (item.kind) {
    case "announcement":
      return `/events/${item.eventSlug}/announcements/${encodeURIComponent(item.slug || item.id)}`;
    case "result":
      return `/events/${item.eventSlug}/results/${item.id}`;
    case "recruitment":
      return `/events/${item.eventSlug}/recruitment/${item.id}`;
  }
}

export async function HomeActivity({
  t,
  kindLabels,
  locale,
}: {
  t: Dictionary["home"];
  kindLabels: Dictionary["activityKind"];
  locale: Locale;
}) {
  const events = await db
    .select({ id: eventsTable.id, slug: eventsTable.slug, name: eventsTable.name, name_en: eventsTable.name_en })
    .from(eventsTable)
    .where(and(eq(eventsTable.pinned, true), eq(eventsTable.status, "published")))
    .orderBy(asc(eventsTable.sort_order));

  if (!events.length) return null;
  const eventIds = events.map((e) => e.id);
  const idToEvent = Object.fromEntries(
    events.map((e) => [e.id, { slug: e.slug, name: localizedField(e, "name", locale).value }]),
  );

  const [annRows, resultRows, recruitRows] = await Promise.all([
    db
      .select({
        id: announcements.id,
        slug: announcements.slug,
        title: announcements.title,
        title_en: announcements.title_en,
        event_id: announcements.event_id,
        created_at: announcements.created_at,
      })
      .from(announcements)
      .where(and(inArray(announcements.event_id, eventIds), liveAnnouncement()))
      .orderBy(desc(announcements.created_at))
      .limit(15),
    db
      .select({
        id: results.id,
        title: results.title,
        title_en: results.title_en,
        event_id: results.event_id,
        created_at: results.created_at,
        author_id: results.author_id,
      })
      .from(results)
      .where(and(inArray(results.event_id, eventIds), eq(results.status, "published")))
      .orderBy(desc(results.created_at))
      .limit(15),
    db
      .select({
        id: competitions.id,
        title: competitions.title,
        event_id: competitions.event_id,
        created_at: competitions.created_at,
      })
      .from(competitions)
      .where(inArray(competitions.event_id, eventIds))
      .orderBy(desc(competitions.created_at))
      .limit(15),
  ]);

  // Look up display names for result authors. Skipping announcements +
  // recruitments — those are typically posted by admins / vendors and the
  // credit isn't interesting on a public timeline.
  const authorIds = Array.from(
    new Set(
      resultRows
        .map((r) => r.author_id)
        .filter((id): id is string => Boolean(id)),
    ),
  );
  const authorNameMap: Record<string, string> = {};
  if (authorIds.length) {
    const profiles = await db
      .select({ id: public_profiles.id, display_name: public_profiles.display_name })
      .from(public_profiles)
      .where(inArray(public_profiles.id, authorIds));
    for (const p of profiles) {
      if (p.display_name) authorNameMap[p.id] = p.display_name;
    }
  }

  const items: ActivityItem[] = [];
  for (const a of annRows) {
    const e = a.event_id ? idToEvent[a.event_id] : null;
    if (!e) continue;
    items.push({
      kind: "announcement",
      id: a.id,
      slug: a.slug,
      title: localizedField(a, "title", locale).value,
      eventSlug: e.slug,
      eventName: e.name,
      createdAt: a.created_at,
    });
  }
  for (const r of resultRows) {
    const e = r.event_id ? idToEvent[r.event_id] : null;
    if (!e) continue;
    items.push({
      kind: "result",
      id: r.id,
      title: localizedField(r, "title", locale).value,
      eventSlug: e.slug,
      eventName: e.name,
      createdAt: r.created_at,
      authorName: r.author_id ? authorNameMap[r.author_id] ?? null : null,
    });
  }
  for (const c of recruitRows) {
    const e = c.event_id ? idToEvent[c.event_id] : null;
    if (!e) continue;
    items.push({
      kind: "recruitment",
      id: c.id,
      title: c.title,
      eventSlug: e.slug,
      eventName: e.name,
      createdAt: c.created_at,
    });
  }
  items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const top = items.slice(0, 10);

  // If multiple pinned events, show event name on each row; if just one, the
  // CTA can point straight at that event.
  const showEventName = events.length > 1;
  const ctaHref = showEventName ? "/events" : `/events/${events[0].slug}`;

  return (
    <div className="container max-w-6xl mx-auto py-16 px-4 flex flex-col gap-8">
      <h2 className="text-2xl font-bold border-l-4 border-primary pl-3">{t.activityHeading}</h2>
      {top.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">{t.activityEmpty}</div>
      ) : (
        <ul className="flex flex-col gap-2">
          {top.map((item) => (
            <li key={`${item.kind}-${item.id}`}>
              <AppLink
                href={buildHref(item)}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors duration-200"
              >
                <Badge variant="secondary" className="shrink-0">
                  {kindLabels[item.kind]}
                </Badge>
                <span className="flex-1 line-clamp-1 text-sm sm:text-base">
                  {item.title}
                  {item.authorName ? (
                    <span className="text-muted-foreground"> — {item.authorName}</span>
                  ) : null}
                </span>
                {showEventName && (
                  <span className="hidden sm:inline shrink-0 text-xs text-muted-foreground">
                    {item.eventName}
                  </span>
                )}
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatDate(item.createdAt, "short", locale)}
                </span>
              </AppLink>
            </li>
          ))}
        </ul>
      )}
      <div className="flex justify-center">
        <Button asChild variant="secondary" className="px-12 text-lg">
          <Link href={localizedPath(ctaHref, locale)}>{t.explore}</Link>
        </Button>
      </div>
    </div>
  );
}
