import { createPublicClient } from "@/lib/supabase/public";
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

async function findAnnouncement(
  supabase: ReturnType<typeof createPublicClient>,
  eventId: string,
  param: string,
): Promise<Announcement | null> {
  const { data: bySlug } = await supabase
    .from("announcements")
    .select("*")
    .eq("event_id", eventId)
    .eq("status", "published")
    .eq("slug", param)
    .maybeSingle();
  if (bySlug) return bySlug as Announcement;
  if (!isUuid(param)) return null;
  const { data: byId } = await supabase
    .from("announcements")
    .select("*")
    .eq("event_id", eventId)
    .eq("status", "published")
    .eq("id", param)
    .maybeSingle();
  return (byId as Announcement | null) ?? null;
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
  const supabase = createPublicClient();

  const eventRes = await supabase
    .from("events")
    .select("id, cover_image")
    .eq("slug", slug)
    .maybeSingle();
  const announcement = eventRes.data
    ? await findAnnouncement(supabase, eventRes.data.id, id)
    : null;

  const title = announcement
    ? localizedField(announcement, "title", locale).value
    : dict.announcement.meta.fallbackTitle;
  const coverImageUrl =
    (announcement ? extractFirstImage(announcement.content as Record<string, unknown> | null) : null) ??
    eventRes.data?.cover_image ??
    null;

  return renderOgImage({
    title,
    badge: OG_BADGE.announcement,
    coverImageUrl,
  });
}
