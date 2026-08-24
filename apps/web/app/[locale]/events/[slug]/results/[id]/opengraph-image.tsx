import { createPublicClient } from "@/lib/supabase/public";
import { defaultLocale, isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { localizedField } from "@/lib/i18n/localized-field";
import { OG_BADGE, OG_HEIGHT, OG_WIDTH, renderOgImage } from "@/lib/seo/og-image";

export const alt = "NYCU Office of AI Affairs — Result";
export const size = { width: OG_WIDTH, height: OG_HEIGHT };
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string; slug: string; id: string }>;
}) {
  const { locale: raw, id } = await params;
  const locale: Locale = isLocale(raw) ? raw : defaultLocale;
  const dict = await getDictionary(locale);
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("results")
    .select("title, title_en, header_image")
    .eq("id", id)
    .eq("status", "published")
    .maybeSingle();

  const title = data
    ? localizedField(data, "title", locale).value
    : dict.results.meta.fallbackTitle;

  return renderOgImage({
    title,
    badge: OG_BADGE.result,
    coverImageUrl: data?.header_image ?? null,
  });
}
