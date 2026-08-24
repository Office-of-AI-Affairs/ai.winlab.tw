import { buildIcsCalendar, type IcsEventInput } from "@/lib/feeds/ics";
import { localePrefix, type Locale } from "@/lib/i18n/config";
import { localizedField } from "@/lib/i18n/localized-field";
import { SITE_URL } from "@/lib/site";
import { createPublicClient } from "@/lib/supabase/public";
import type { Event } from "@winlab/db";

const CALENDAR_NAME: Record<Locale, string> = {
  "zh-TW": "人工智慧專責辦公室 活動",
  en: "NYCU Office of AI Affairs — Events",
};

// `events` has no start/end date or location columns (see database.types.ts
// — only name/name_en/description/cover_image/slug/pinned/sort_order/
// status/created_at/updated_at). #46 asks for correct "start time" on the
// calendar entry; rather than fabricate one, every VEVENT is an all-day
// entry dated on `created_at` (the only date the row actually has), with
// this caveat appended to DESCRIPTION so nobody mistakes it for a real
// event date. LOCATION is omitted entirely — there's nothing to put there.
const NO_DATE_CAVEAT: Record<Locale, string> = {
  "zh-TW": "（本活動尚無起訖日期資料，此為活動頁面建立日期，非實際活動時間）",
  en: "(This event has no start/end date on record — the date shown is when the event page was created, not the actual event date.)",
};

function toIcsEvent(event: Pick<Event, "id" | "slug" | "name" | "name_en" | "description" | "created_at">, locale: Locale): IcsEventInput {
  const summary = localizedField(event, "name", locale).value;
  const createdAt = new Date(event.created_at);
  const descriptionParts = [event.description, NO_DATE_CAVEAT[locale]].filter(Boolean);

  return {
    uid: `event-${event.id}@ai.winlab.tw`,
    summary,
    description: descriptionParts.join("\n\n"),
    url: `${SITE_URL}${localePrefix(locale)}/events/${event.slug}`,
    startDate: createdAt,
    createdAt,
  };
}

/** All published events as a single subscribable VCALENDAR (#46). */
export async function buildAllEventsIcs(locale: Locale): Promise<string> {
  const supabase = createPublicClient();
  const { data: events } = await supabase
    .from("events")
    .select("id, slug, name, name_en, description, created_at")
    .eq("status", "published")
    .order("sort_order", { ascending: true });

  return buildIcsCalendar({
    calendarName: CALENDAR_NAME[locale],
    events: (events ?? []).map((e) => toIcsEvent(e, locale)),
  });
}

/** A single published event's `.ics`, or `null` if it doesn't exist / isn't
 *  published (route handler turns that into a 404). */
export async function buildEventIcs(slug: string, locale: Locale): Promise<string | null> {
  const supabase = createPublicClient();
  const { data: event } = await supabase
    .from("events")
    .select("id, slug, name, name_en, description, created_at")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (!event) return null;

  return buildIcsCalendar({
    calendarName: CALENDAR_NAME[locale],
    events: [toIcsEvent(event, locale)],
  });
}

export const ICS_RESPONSE_HEADERS = {
  "Content-Type": "text/calendar; charset=utf-8",
  "Cache-Control": "public, max-age=600, s-maxage=600",
} as const;
