import { getPublishedAnnouncementByParam } from "@/app/[locale]/announcement/data";
import { defaultLocale, isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { localizedField } from "@/lib/i18n/localized-field";
import { extractFirstImage } from "@/lib/ui/article";
import { OG_BADGE, OG_HEIGHT, OG_WIDTH, renderOgImage } from "@/lib/seo/og-image";

export const alt = "NYCU Office of AI Affairs — Announcement";
export const size = { width: OG_WIDTH, height: OG_HEIGHT };
export const contentType = "image/png";

// See `[id]/page.tsx` for the fuller writeup: Next 16 / Turbopack doesn't
// consistently decode the `[id]` segment before it reaches file-convention
// route handlers either — decode defensively (a no-op on an
// already-decoded string, since slugs can never contain a literal "%").
function decodeParam(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: raw, id: rawId } = await params;
  const id = decodeParam(rawId);
  const locale: Locale = isLocale(raw) ? raw : defaultLocale;
  const dict = await getDictionary(locale);
  const announcement = await getPublishedAnnouncementByParam(id);
  const title = announcement
    ? localizedField(announcement, "title", locale).value
    : dict.announcement.meta.fallbackTitle;
  const coverImageUrl = announcement
    ? extractFirstImage(announcement.content as Record<string, unknown> | null)
    : null;

  return renderOgImage({
    title,
    badge: OG_BADGE.announcement,
    coverImageUrl,
  });
}
