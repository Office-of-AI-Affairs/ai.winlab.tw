import { eq, isNotNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { liveAnnouncement } from "@/lib/db/filters";
import { announcements, articles, competitions, events, results } from "@/lib/db/schema";
import type { MetadataRoute } from "next";

// Reads the database, so it renders per request (cached by the route cache
// for an hour) rather than at build time, where there is no database.
export const dynamic = "force-dynamic";
export const revalidate = 3600;

const BASE_URL = "https://ai.winlab.tw";

/** English (`/en`) variant of a zh-TW (bare) URL. */
function enUrl(url: string): string {
  return url === BASE_URL ? `${BASE_URL}/en` : url.replace(BASE_URL, `${BASE_URL}/en`);
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [announcementRows, eventRows, resultRows, recruitmentRows, articleRows] = await Promise.all([
    db
      .select({ slug: announcements.slug, date: announcements.date, event_id: announcements.event_id })
      .from(announcements)
      .where(liveAnnouncement()),
    db
      .select({ id: events.id, slug: events.slug, updated_at: events.updated_at })
      .from(events)
      .where(eq(events.status, "published")),
    db
      .select({ id: results.id, date: results.date, event_id: results.event_id, author_id: results.author_id })
      .from(results)
      .where(eq(results.status, "published")),
    db
      .select({ id: competitions.id, event_id: competitions.event_id })
      .from(competitions)
      .where(isNotNull(competitions.event_id)),
    db
      .select({
        id: articles.id,
        published_at: articles.published_at,
        updated_at: articles.updated_at,
        created_at: articles.created_at,
      })
      .from(articles)
      .where(eq(articles.status, "published")),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL, priority: 1 },
    { url: `${BASE_URL}/introduction`, priority: 0.8 },
    { url: `${BASE_URL}/announcement`, priority: 0.8 },
    { url: `${BASE_URL}/events`, priority: 0.8 },
    { url: `${BASE_URL}/insights`, priority: 0.8 },
    { url: `${BASE_URL}/privacy`, priority: 0.3 },
    { url: `${BASE_URL}/accessibility`, priority: 0.3 },
  ];

  const eventRoutes: MetadataRoute.Sitemap = eventRows.flatMap((e) => [
    {
      url: `${BASE_URL}/events/${e.slug}`,
      lastModified: e.updated_at ?? undefined,
      priority: 0.7,
    },
    // Tab listings — each gets its own URL after #1. /members intentionally
    // omitted: auth-gated, no public content.
    {
      url: `${BASE_URL}/events/${e.slug}/announcements`,
      lastModified: e.updated_at ?? undefined,
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/events/${e.slug}/results`,
      lastModified: e.updated_at ?? undefined,
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/events/${e.slug}/recruitment`,
      lastModified: e.updated_at ?? undefined,
      priority: 0.7,
    },
  ]);

  const eventSlugMap = Object.fromEntries(
    eventRows.map((event) => [event.id, event.slug])
  );

  const announcementRoutes: MetadataRoute.Sitemap = announcementRows.map((announcement) => ({
    url: announcement.event_id && eventSlugMap[announcement.event_id]
      ? `${BASE_URL}/events/${eventSlugMap[announcement.event_id]}/announcements/${encodeURIComponent(announcement.slug)}`
      : `${BASE_URL}/announcement/${encodeURIComponent(announcement.slug)}`,
    lastModified: announcement.date ?? undefined,
    priority: 0.6,
  }));

  const resultRoutes: MetadataRoute.Sitemap = resultRows
    .filter((result) => result.event_id && eventSlugMap[result.event_id])
    .map((result) => ({
      url: `${BASE_URL}/events/${eventSlugMap[result.event_id!]}/results/${result.id}`,
      lastModified: result.date ?? undefined,
      priority: 0.6,
    }));

  // 只納入有 published 成果的作者，避免大量空 profile 稀釋爬取品質
  const authorIds = [
    ...new Set(resultRows.map((r) => r.author_id).filter((id): id is string => Boolean(id))),
  ];
  const profileRoutes: MetadataRoute.Sitemap = authorIds.map((id) => ({
    url: `${BASE_URL}/profile/${id}`,
    priority: 0.5,
  }));

  const recruitmentRoutes: MetadataRoute.Sitemap = recruitmentRows
    .filter((r) => r.event_id && eventSlugMap[r.event_id])
    .map((r) => ({
      url: `${BASE_URL}/events/${eventSlugMap[r.event_id!]}/recruitment/${r.id}`,
      priority: 0.5,
    }));

  const articleRoutes: MetadataRoute.Sitemap = articleRows.map((article) => ({
    url: `${BASE_URL}/insights/${article.id}`,
    lastModified: article.published_at ?? article.updated_at ?? article.created_at ?? undefined,
    priority: 0.6,
  }));

  const all: MetadataRoute.Sitemap = [
    ...staticRoutes,
    ...announcementRoutes,
    ...eventRoutes,
    ...resultRoutes,
    ...profileRoutes,
    ...recruitmentRoutes,
    ...articleRoutes,
  ];

  // Every public page also exists at `/en/*`; advertise the alternate so
  // crawlers pick up the English version (chrome is localized, article bodies
  // stay as authored). The zh-TW (bare) URL remains the primary entry.
  return all.map((entry) => ({
    ...entry,
    alternates: {
      languages: {
        "zh-TW": entry.url,
        en: enUrl(entry.url),
      },
    },
  }));
}
