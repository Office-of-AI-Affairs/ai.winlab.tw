import { JsonLd } from "@/components/json-ld";
import { EventsPageClient } from "./client";
import { getPublishedEvents } from "./data";
import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/site";
import { defaultLocale, isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { localeAlternates, ogAlternateLocales, ogLocale } from "@/lib/i18n/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : defaultLocale;
  const dict = await getDictionary(locale);
  const title = dict.events.meta.listTitle;
  const description = dict.events.meta.listDescription;
  const alternates = localeAlternates("/events", locale);

  return {
    title,
    description,
    alternates: {
      canonical: alternates.canonical,
      languages: alternates.languages,
    },
    // Next.js App Router performs object-level replace (not deep merge) when a
    // child segment exports openGraph. All required fields must be declared here
    // explicitly; relying on layout.tsx inheritance silently drops og:image.
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: ogLocale(locale),
      alternateLocale: ogAlternateLocales(locale),
      title,
      description,
      url: alternates.canonical,
      images: [
        {
          url: "/og.png",
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
  };
}

export default async function EventsPage() {
  const publishedEvents = await getPublishedEvents();

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "人工智慧專責辦公室活動列表",
    itemListElement: publishedEvents.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `https://ai.winlab.tw/events/${item.slug}`,
      name: item.name,
    })),
  };

  return (
    <>
      <JsonLd data={structuredData} />
      <EventsPageClient publishedEvents={publishedEvents} />
    </>
  );
}
