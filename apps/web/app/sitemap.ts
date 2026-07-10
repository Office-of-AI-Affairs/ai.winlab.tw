import { createPublicClient } from "@/lib/supabase/public";
import type { MetadataRoute } from "next";

const BASE_URL = "https://ai.winlab.tw";

/** English (`/en`) variant of a zh-TW (bare) URL. */
function enUrl(url: string): string {
  return url === BASE_URL ? `${BASE_URL}/en` : url.replace(BASE_URL, `${BASE_URL}/en`);
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createPublicClient();

  const [
    announcementsRes,
    eventsRes,
    resultsRes,
    profilesRes,
    recruitmentRes,
    articlesRes,
  ] = await Promise.all([
    supabase
      .from("announcements")
      .select("id, date, event_id")
      .eq("status", "published"),
    supabase.from("events").select("id, slug, updated_at").eq("status", "published"),
    supabase
      .from("results")
      .select("id, date, event_id, author_id")
      .eq("status", "published"),
    // 只納入有 published 成果的作者，避免大量空 profile 稀釋爬取品質
    supabase
      .from("results")
      .select("author_id")
      .eq("status", "published")
      .not("author_id", "is", null),
    supabase
      .from("competitions")
      .select("id, event_id")
      .not("event_id", "is", null),
    supabase
      .from("articles")
      .select("id, published_at, updated_at, created_at")
      .eq("status", "published"),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL, priority: 1 },
    { url: `${BASE_URL}/introduction`, priority: 0.8 },
    { url: `${BASE_URL}/announcement`, priority: 0.8 },
    { url: `${BASE_URL}/events`, priority: 0.8 },
    { url: `${BASE_URL}/insights`, priority: 0.8 },
    { url: `${BASE_URL}/privacy`, priority: 0.3 },
  ];

  const eventRoutes: MetadataRoute.Sitemap = (eventsRes.data ?? []).flatMap((e) => [
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
    (eventsRes.data ?? []).map((event) => [event.id, event.slug])
  );

  const announcementRoutes: MetadataRoute.Sitemap = (announcementsRes.data ?? []).map((announcement) => ({
    url: announcement.event_id && eventSlugMap[announcement.event_id]
      ? `${BASE_URL}/events/${eventSlugMap[announcement.event_id]}/announcements/${announcement.id}`
      : `${BASE_URL}/announcement/${announcement.id}`,
    lastModified: announcement.date ?? undefined,
    priority: 0.6,
  }));

  const resultRoutes: MetadataRoute.Sitemap = (resultsRes.data ?? [])
    .filter((result) => result.event_id && eventSlugMap[result.event_id])
    .map((result) => ({
      url: `${BASE_URL}/events/${eventSlugMap[result.event_id!]}/results/${result.id}`,
      lastModified: result.date ?? undefined,
      priority: 0.6,
    }));

  const authorIds = [...new Set((profilesRes.data ?? []).map((r) => r.author_id as string))];
  const profileRoutes: MetadataRoute.Sitemap = authorIds.map((id) => ({
    url: `${BASE_URL}/profile/${id}`,
    priority: 0.5,
  }));

  const recruitmentRoutes: MetadataRoute.Sitemap = (recruitmentRes.data ?? [])
    .filter((r) => r.event_id && eventSlugMap[r.event_id])
    .map((r) => ({
      url: `${BASE_URL}/events/${eventSlugMap[r.event_id!]}/recruitment/${r.id}`,
      priority: 0.5,
    }));

  const articleRoutes: MetadataRoute.Sitemap = (articlesRes.data ?? []).map((article) => ({
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
