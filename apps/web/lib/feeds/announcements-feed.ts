import { buildRssFeed, type RssItemInput } from "@/lib/feeds/rss";
import { localePrefix, type Locale } from "@/lib/i18n/config";
import { localizedField } from "@/lib/i18n/localized-field";
import { SITE_URL } from "@/lib/site";
import { createPublicClient } from "@/lib/supabase/public";

const CHANNEL_TITLE: Record<Locale, string> = {
  "zh-TW": "人工智慧專責辦公室 公告",
  en: "Announcements — NYCU Office of AI Affairs",
};

const CHANNEL_DESCRIPTION: Record<Locale, string> = {
  "zh-TW": "國立陽明交通大學人工智慧專責辦公室公告 RSS feed",
  en: "RSS feed for announcements from NYCU's Office of AI Affairs",
};

// RSS <language> wants a real BCP-47 tag; "zh-TW" already is one, "en"
// needs a region for readers that validate strictly.
const CHANNEL_LANGUAGE: Record<Locale, string> = {
  "zh-TW": "zh-TW",
  en: "en-US",
};

/**
 * Build the announcements RSS document (#46). Shared by
 * `app/[locale]/announcement/rss.xml/route.ts` (the canonical, locale-
 * prefixed feed) and `app/rss.xml/route.ts` (the discoverable root alias,
 * always zh-TW) so there's exactly one query + XML-building path.
 *
 * Body content (Tiptap `content`) stays zh-TW only regardless of locale —
 * see 20260824000002_i18n_announcements_events_results_en.sql — so only
 * the channel chrome and each item's `title` (via `localizedField`) vary
 * between locales; the underlying announcement set is identical.
 */
export async function buildAnnouncementsRssXml(locale: Locale): Promise<string> {
  const supabase = createPublicClient();

  const { data: announcements } = await supabase
    .from("announcements")
    .select("id, slug, title, title_en, date, category, event_id, updated_at")
    .eq("status", "published")
    .order("date", { ascending: false })
    .limit(30);

  const eventIds = Array.from(
    new Set((announcements ?? []).map((a) => a.event_id).filter(Boolean)),
  ) as string[];
  let slugMap: Record<string, string> = {};
  if (eventIds.length) {
    const { data: events } = await supabase
      .from("events")
      .select("id, slug")
      .in("id", eventIds);
    slugMap = Object.fromEntries((events ?? []).map((e) => [e.id, e.slug]));
  }

  const prefix = localePrefix(locale);
  const items: RssItemInput[] = (announcements ?? []).map((a) => {
    const url =
      a.event_id && slugMap[a.event_id]
        ? `${SITE_URL}${prefix}/events/${slugMap[a.event_id]}/announcements/${encodeURIComponent(a.slug)}`
        : `${SITE_URL}${prefix}/announcement/${encodeURIComponent(a.slug)}`;
    return {
      title: localizedField(a, "title", locale).value,
      url,
      guid: url,
      guidIsPermaLink: true,
      pubDate: new Date(a.date),
      category: a.category,
    };
  });

  return buildRssFeed({
    title: CHANNEL_TITLE[locale],
    link: `${SITE_URL}${prefix}/announcement`,
    description: CHANNEL_DESCRIPTION[locale],
    language: CHANNEL_LANGUAGE[locale],
    selfUrl: `${SITE_URL}${prefix}/announcement/rss.xml`,
    items,
  });
}

export const RSS_RESPONSE_HEADERS = {
  "Content-Type": "application/rss+xml; charset=utf-8",
  "Cache-Control": "public, max-age=600, s-maxage=600",
} as const;
