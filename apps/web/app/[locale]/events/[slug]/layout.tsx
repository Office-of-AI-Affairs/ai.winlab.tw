import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { JsonLd } from "@/components/json-ld";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { defaultLocale, isLocale } from "@/lib/i18n/config";
import { localeAlternates } from "@/lib/i18n/seo";
import type { Metadata } from "next";

const getEventMeta = unstable_cache(
  async (slug: string) => {
    const supabase = createPublicClient();
    const { data } = await supabase
      .from("events")
      .select("name, description, cover_image")
      .eq("slug", slug)
      .maybeSingle();
    return data as { name: string; description: string | null; cover_image: string | null } | null;
  },
  ["event-meta"],
  { tags: ["events-published"], revalidate: 3600 },
);

// Fallback metadata for the /events/[slug] tree. Each tab-listing page
// (announcements / results / recruitment / members) overrides title +
// canonical + openGraph.url with its own keyword-focused variant.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : defaultLocale;
  const dict = await getDictionary(locale);
  const data = await getEventMeta(slug);

  const name = data?.name ?? dict.events.meta.fallbackName;
  const description =
    data?.description ?? dict.events.meta.fallbackDescription.replace("{name}", name);
  const ogImages = data?.cover_image
    ? [{ url: data.cover_image, width: 1200, height: 630, alt: name }]
    : [];
  const a = localeAlternates(`/events/${slug}`, locale);
  return {
    title: `${name}${dict.events.meta.titleSuffix}`,
    description,
    alternates: {
      canonical: a.canonical,
      languages: a.languages,
    },
    openGraph: {
      title: `${name}${dict.events.meta.titleSuffix}`,
      description,
      url: `/events/${slug}`,
      images: ogImages,
    },
  };
}

// Event JSON-LD lives on the layout so it's emitted on every tab listing
// (announcements / results / recruitment / members) without duplicating
// the structured data block in four sibling page.tsx files.
export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: rawLocale, slug } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : defaultLocale;
  const dict = await getDictionary(locale);
  const data = await getEventMeta(slug);
  const structuredData = data
    ? {
        "@context": "https://schema.org",
        "@type": "Event",
        name: data.name,
        description:
          data.description ?? dict.events.meta.fallbackDescription.replace("{name}", data.name),
        url: `https://ai.winlab.tw/events/${slug}`,
        eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
        organizer: {
          "@type": "Organization",
          name: dict.common.orgFullName,
          url: "https://ai.winlab.tw",
        },
      }
    : null;

  return (
    <>
      {structuredData && <JsonLd data={structuredData} />}
      {children}
    </>
  );
}
