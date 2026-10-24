import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { liveAnnouncement } from "@/lib/db/filters";
import { announcements, events } from "@/lib/db/schema";
import type { Announcement } from "@winlab/db";
import { defaultLocale, isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { localizedField } from "@/lib/i18n/localized-field";
import { isUuid } from "@/lib/slug";
import { extractFirstImage } from "@/lib/ui/article";
import { OG_BADGE, OG_HEIGHT, OG_WIDTH, renderOgImage } from "@/lib/seo/og-image";

export const alt = "NYCU Office of AI Affairs — Announcement";
export const size = { width: OG_WIDTH, height: OG_HEIGHT };
export const contentType = "image/png";

// See sibling `page.tsx` for the fuller writeup on why this decodes
// defensively.
function decodeParam(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

async function findAnnouncement(eventId: string, param: string): Promise<Announcement | null> {
  const [bySlug] = await db
    .select()
    .from(announcements)
    .where(and(eq(announcements.event_id, eventId), liveAnnouncement(), eq(announcements.slug, param)))
    .limit(1);
  if (bySlug) return bySlug;
  if (!isUuid(param)) return null;
  const [byId] = await db
    .select()
    .from(announcements)
    .where(and(eq(announcements.event_id, eventId), liveAnnouncement(), eq(announcements.id, param)))
    .limit(1);
  return byId ?? null;
}

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string; slug: string; id: string }>;
}) {
  const { locale: raw, slug, id: rawId } = await params;
  const id = decodeParam(rawId);
  const locale: Locale = isLocale(raw) ? raw : defaultLocale;
  const dict = await getDictionary(locale);
  const [event] = await db
    .select({ id: events.id, cover_image: events.cover_image })
    .from(events)
    .where(and(eq(events.slug, slug), eq(events.status, "published")))
    .limit(1);
  const announcement = event ? await findAnnouncement(event.id, id) : null;

  const title = announcement
    ? localizedField(announcement, "title", locale).value
    : dict.announcement.meta.fallbackTitle;
  const coverImageUrl =
    (announcement ? extractFirstImage(announcement.content as Record<string, unknown> | null) : null) ??
    event?.cover_image ??
    null;

  return renderOgImage({
    title,
    badge: OG_BADGE.announcement,
    coverImageUrl,
  });
}
