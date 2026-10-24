import { buildAnnouncementsRssXml, RSS_RESPONSE_HEADERS } from "@/lib/feeds/announcements-feed";
import { defaultLocale, isLocale, type Locale } from "@/lib/i18n/config";

// Reads Postgres, so never prerendered at build; Cache-Control caches it.
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ locale: string }> },
) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : defaultLocale;

  const rss = await buildAnnouncementsRssXml(locale);

  return new Response(rss, { headers: RSS_RESPONSE_HEADERS });
}
