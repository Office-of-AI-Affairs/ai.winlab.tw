import { createClient } from "@/lib/supabase/server";
import type { MetadataRoute } from "next";

const BASE_URL = "https://ai.winlab.tw";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient();

  const [announcementsRes, eventsRes, resultsRes, teamsRes, profilesRes] = await Promise.all([
    supabase
      .from("announcements")
      .select("id, date")
      .eq("status", "published")
      .is("event_id", null),
    supabase.from("events").select("id, slug, updated_at").eq("status", "published"),
    supabase
      .from("results")
      .select("id, date, event_id")
      .eq("status", "published"),
    supabase.from("teams").select("id"),
    supabase.from("public_profiles").select("id"),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL, priority: 1 },
    { url: `${BASE_URL}/introduction`, priority: 0.8 },
    { url: `${BASE_URL}/organization`, priority: 0.7 },
    { url: `${BASE_URL}/announcement`, priority: 0.8 },
    { url: `${BASE_URL}/events`, priority: 0.8 },
    { url: `${BASE_URL}/recruitment`, priority: 0.7 },
    { url: `${BASE_URL}/privacy`, priority: 0.3 },
  ];

  const announcementRoutes: MetadataRoute.Sitemap = (announcementsRes.data ?? []).map((a) => ({
    url: `${BASE_URL}/announcement/${a.id}`,
    lastModified: a.date ?? undefined,
    priority: 0.6,
  }));

  const eventRoutes: MetadataRoute.Sitemap = (eventsRes.data ?? []).map((e) => ({
    url: `${BASE_URL}/events/${e.slug}`,
    lastModified: e.updated_at ?? undefined,
    priority: 0.7,
  }));

  const eventSlugMap = Object.fromEntries(
    (eventsRes.data ?? []).map((event) => [event.id, event.slug])
  );

  const resultRoutes: MetadataRoute.Sitemap = (resultsRes.data ?? [])
    .filter((result) => result.event_id && eventSlugMap[result.event_id])
    .map((result) => ({
      url: `${BASE_URL}/events/${eventSlugMap[result.event_id!]}/results/${result.id}`,
      lastModified: result.date ?? undefined,
      priority: 0.6,
    }));

  const teamRoutes: MetadataRoute.Sitemap = (teamsRes.data ?? []).map((team) => ({
    url: `${BASE_URL}/team/${team.id}`,
    priority: 0.5,
  }));

  const profileRoutes: MetadataRoute.Sitemap = (profilesRes.data ?? []).map((profile) => ({
    url: `${BASE_URL}/profile/${profile.id}`,
    priority: 0.5,
  }));

  return [
    ...staticRoutes,
    ...announcementRoutes,
    ...eventRoutes,
    ...resultRoutes,
    ...teamRoutes,
    ...profileRoutes,
  ];
}
