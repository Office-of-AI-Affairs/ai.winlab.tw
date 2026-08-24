import { createPublicClient } from "@/lib/supabase/public";
import { defaultLocale, isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { localizedField } from "@/lib/i18n/localized-field";
import { OG_BADGE, OG_HEIGHT, OG_WIDTH, renderOgImage } from "@/lib/seo/og-image";

export const alt = "NYCU Office of AI Affairs — Event";
export const size = { width: OG_WIDTH, height: OG_HEIGHT };
export const contentType = "image/png";

// Applies to the whole /events/[slug] subtree (announcements/results/
// recruitment/members tabs) per Next's closest-segment file-convention
// rule — there's no more specific opengraph-image below this segment, so
// every tab shares the event's own branded card.
export default async function Image({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: raw, slug } = await params;
  const locale: Locale = isLocale(raw) ? raw : defaultLocale;
  const dict = await getDictionary(locale);
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("events")
    .select("name, name_en, cover_image")
    .eq("slug", slug)
    .maybeSingle();

  const title = data ? localizedField(data, "name", locale).value : dict.events.meta.fallbackName;

  return renderOgImage({
    title,
    badge: OG_BADGE.event,
    coverImageUrl: data?.cover_image ?? null,
  });
}
