import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { liveAnnouncement } from "@/lib/db/filters";
import { announcements, events } from "@/lib/db/schema";
import type { Announcement } from "@winlab/db";
import { renderArticle } from "@/lib/ui/rich-text";
import { estimateReadingTime } from "@/lib/ui/reading-time";
import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/site";
import { defaultLocale, isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { localeAlternates, ogLocale } from "@/lib/i18n/seo";
import { localizedField } from "@/lib/i18n/localized-field";
import { localizedPath } from "@/lib/i18n/routing";
import { isUuid } from "@/lib/slug";
import { permanentRedirect } from "next/navigation";
import { EventAnnouncementArticleClient } from "./article-client";
import { EventAnnouncementDraftFallback } from "./draft-fallback";

// Next.js does not consistently decode the `[id]` segment before it reaches
// the page component (observed inconsistency vs. generateMetadata's params
// on Next 16 / Turbopack for CJK route params — see the sibling
// announcement/[id]/page.tsx for the fuller writeup). Decode defensively;
// slugs can never contain a literal "%" (stripped in lib/slug.ts), so
// decoding an already-decoded string is always a safe no-op.
function decodeParam(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

// `param` is whatever arrived in the `[id]` route segment — a slug for every
// link this app generates, or a legacy UUID for old bookmarks/backlinks.
// Slug lookup first; UUID fallback only if the param actually looks like one.
// Live rows only: visitors never saw drafts here (RLS), and the metadata
// must not leak a draft's title either. Drafts render through the
// client-side fallback for editors.
async function findAnnouncement(eventId: string, param: string): Promise<Announcement | null> {
  const [bySlug] = await db
    .select()
    .from(announcements)
    .where(and(eq(announcements.event_id, eventId), liveAnnouncement(), eq(announcements.slug, param)))
    .limit(1);
  if (bySlug) return bySlug;
  if (!isUuid(param)) return null;
  const [byId] = await db
    .select()
    .from(announcements)
    .where(and(eq(announcements.event_id, eventId), liveAnnouncement(), eq(announcements.id, param)))
    .limit(1);
  return byId ?? null;
}

async function findEvent(slug: string) {
  const [event] = await db
    .select({ id: events.id, name: events.name, name_en: events.name_en })
    .from(events)
    .where(and(eq(events.slug, slug), eq(events.status, "published")))
    .limit(1);
  return event ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string; id: string }>;
}): Promise<Metadata> {
  const { locale: raw, slug, id: rawId } = await params;
  const id = decodeParam(rawId);
  const locale: Locale = isLocale(raw) ? raw : defaultLocale;
  const dict = await getDictionary(locale);
  const event = await findEvent(slug);
  const announcement = event ? await findAnnouncement(event.id, id) : null;
  const title = announcement
    ? localizedField(announcement, "title", locale).value
    : dict.announcement.meta.fallbackTitle;
  const description = announcement?.category
    ? dict.announcement.meta.categoryDescription
        .replace("{category}", announcement.category)
        .replace("{title}", title)
    : dict.announcement.meta.fallbackDescription.replace("{title}", title);
  // Canonical always points at the slug URL, even when this render was
  // reached via a legacy UUID link.
  const canonicalId = announcement?.slug ?? id;
  const a = localeAlternates(
    `/events/${slug}/announcements/${encodeURIComponent(canonicalId)}`,
    locale,
  );
  return {
    title: `${title}｜${dict.common.orgFullName}`,
    description,
    alternates: { canonical: a.canonical, languages: a.languages },
    // Next.js App Router performs object-level replace (not deep merge) when a
    // child segment exports openGraph. All required fields must be declared here
    // explicitly; relying on layout.tsx inheritance silently drops og:type /
    // og:site_name / og:locale. `images` is intentionally omitted — the
    // sibling `opengraph-image.tsx` file convention (#49) generates a
    // per-announcement branded card and Next injects it automatically.
    openGraph: {
      type: "article",
      siteName: SITE_NAME,
      locale: ogLocale(locale),
      title: `${title}｜${dict.common.orgFullName}`,
      description,
      url: `/events/${slug}/announcements/${encodeURIComponent(canonicalId)}`,
    },
    twitter: {
      card: "summary_large_image",
      title: `${title}｜${dict.common.orgFullName}`,
      description,
    },
  };
}

export default async function EventAnnouncementDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string; id: string }>;
}) {
  const { locale: raw, slug, id: rawId } = await params;
  const id = decodeParam(rawId);
  const locale: Locale = isLocale(raw) ? raw : defaultLocale;
  const dict = await getDictionary(locale);
  const event = await findEvent(slug);
  const announcement = event ? await findAnnouncement(event.id, id) : null;

  if (!announcement) {
    return <EventAnnouncementDraftFallback slug={slug} id={id} />;
  }

  // Legacy `[uuid]` link that resolved by id — send visitors (and search
  // engines) forward to the canonical slug URL permanently.
  if (isUuid(id) && announcement.slug !== id) {
    permanentRedirect(
      localizedPath(
        `/events/${slug}/announcements/${encodeURIComponent(announcement.slug)}`,
        locale,
      ),
    );
  }

  const eventName = event
    ? localizedField(event, "name", locale).value
    : dict.events.meta.fallbackName;

  const { html, toc } = renderArticle(announcement.content);
  const { minutes: readingTimeMin } = estimateReadingTime(announcement.content);

  return (
    <EventAnnouncementArticleClient
      slug={slug}
      eventName={eventName}
      initialAnnouncement={announcement}
      initialContentHtml={html}
      initialToc={toc}
      readingTimeMin={readingTimeMin}
    />
  );
}
