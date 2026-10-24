import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema";
import { defaultLocale, isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { localizedField } from "@/lib/i18n/localized-field";
import { OG_BADGE, OG_HEIGHT, OG_WIDTH, renderOgImage } from "@/lib/seo/og-image";

export const alt = "NYCU Office of AI Affairs — Event";
export const size = { width: OG_WIDTH, height: OG_HEIGHT };
export const contentType = "image/png";

// Serves `/events/[slug]/opengraph-image` directly, and is also inherited
// by tab pages that declare no `openGraph` of their own (e.g.
// `members/page.tsx`). announcements/results/recruitment declare their own
// `openGraph` (their own title/description), so they can't inherit this
// file via Next's convention — they instead point their own `images` at
// this same route explicitly (see their `generateMetadata`).
export default async function Image({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: raw, slug } = await params;
  const locale: Locale = isLocale(raw) ? raw : defaultLocale;
  const dict = await getDictionary(locale);
  const [data] = await db
    .select({ name: events.name, name_en: events.name_en, cover_image: events.cover_image })
    .from(events)
    .where(and(eq(events.slug, slug), eq(events.status, "published")))
    .limit(1);

  const title = data ? localizedField(data, "name", locale).value : dict.events.meta.fallbackName;

  return renderOgImage({
    title,
    badge: OG_BADGE.event,
    coverImageUrl: data?.cover_image ?? null,
  });
}
