import { buildEventIcs, ICS_RESPONSE_HEADERS } from "@/lib/feeds/events-calendar";
import { defaultLocale, isLocale, type Locale } from "@/lib/i18n/config";

export const revalidate = 600;

/** `.ics` download for a single published event (#46). */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ locale: string; slug: string }> },
) {
  const { locale: raw, slug } = await params;
  const locale: Locale = isLocale(raw) ? raw : defaultLocale;

  const ics = await buildEventIcs(slug, locale);
  if (ics === null) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(ics, {
    headers: {
      ...ICS_RESPONSE_HEADERS,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(slug)}.ics"`,
    },
  });
}
