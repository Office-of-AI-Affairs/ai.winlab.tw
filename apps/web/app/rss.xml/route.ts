import { buildAnnouncementsRssXml, RSS_RESPONSE_HEADERS } from "@/lib/feeds/announcements-feed";
import { defaultLocale } from "@/lib/i18n/config";

// Reads Postgres, so never prerendered at build; Cache-Control caches it.
export const dynamic = "force-dynamic";

/**
 * Discoverable, un-prefixed `/rss.xml` (#46) — feed readers and crawlers
 * expect it at the site root; the canonical, locale-aware feed lives at
 * `/announcement/rss.xml` (and `/en/announcement/rss.xml`). This route sits
 * outside the `[locale]` tree (see `proxy.ts`'s `ROOT_METADATA`, same
 * treatment as `/sitemap.xml`/`/robots.txt`) and always serves the
 * default-locale (zh-TW) feed — same content `/announcement/rss.xml`
 * serves, just discoverable at the URL feed readers try first.
 */
export async function GET() {
  const rss = await buildAnnouncementsRssXml(defaultLocale);
  return new Response(rss, { headers: RSS_RESPONSE_HEADERS });
}
