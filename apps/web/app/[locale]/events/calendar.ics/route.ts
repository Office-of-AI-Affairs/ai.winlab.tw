import { buildAllEventsIcs, ICS_RESPONSE_HEADERS } from "@/lib/feeds/events-calendar";
import { defaultLocale, isLocale, type Locale } from "@/lib/i18n/config";

export const revalidate = 600;

/** Subscribable calendar of every published event (#46) — one VEVENT per
 *  event, see `lib/feeds/events-calendar.ts` for the all-day-date caveat. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ locale: string }> },
) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : defaultLocale;

  const ics = await buildAllEventsIcs(locale);

  return new Response(ics, { headers: ICS_RESPONSE_HEADERS });
}
