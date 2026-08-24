import { buildAnnouncementsRssXml, RSS_RESPONSE_HEADERS } from "@/lib/feeds/announcements-feed";
import { defaultLocale, isLocale, type Locale } from "@/lib/i18n/config";

export const revalidate = 600;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ locale: string }> },
) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : defaultLocale;

  const rss = await buildAnnouncementsRssXml(locale);

  return new Response(rss, { headers: RSS_RESPONSE_HEADERS });
}
