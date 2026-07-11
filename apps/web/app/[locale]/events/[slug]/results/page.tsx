import { EventDetailClient } from "../client";
import { EventDetailNotFoundClient } from "../not-found-client";
import { getEventPageData } from "../data";
import { JsonLd } from "@/components/json-ld";
import type { Metadata } from "next";
import { defaultLocale, isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { localeAlternates } from "@/lib/i18n/seo";

// Tab-as-route: /events/[slug]/results. See issue #1.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}): Promise<Metadata> {
  const { slug, locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : defaultLocale;
  const dict = await getDictionary(locale);
  const data = await getEventPageData(slug);
  if (!data) return { title: dict.events.meta.resultsFallbackTitle };
  const title = dict.events.meta.resultsTitle.replace("{name}", data.event.name);
  const description = dict.events.meta.resultsDescription.replace("{name}", data.event.name);
  const ogImages = data.event.cover_image
    ? [{ url: data.event.cover_image, width: 1200, height: 630, alt: data.event.name }]
    : [];
  const twitterImages = ogImages.length ? ogImages.map((i) => i.url) : ["/og.png"];
  const a = localeAlternates(`/events/${slug}/results`, locale);
  return {
    title,
    description,
    alternates: { canonical: a.canonical, languages: a.languages },
    openGraph: { title, description, url: a.canonical, images: ogImages },
    twitter: { card: "summary_large_image", title, description, images: twitterImages },
  };
}

export default async function EventResultsPage({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}) {
  const { slug, locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : defaultLocale;
  const dict = await getDictionary(locale);
  const data = await getEventPageData(slug);

  if (!data) {
    return <EventDetailNotFoundClient slug={slug} />;
  }

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${data.event.name} ${dict.events.tabs.results}`,
    url: `https://ai.winlab.tw/events/${slug}/results`,
    isPartOf: {
      "@type": "WebSite",
      name: dict.common.orgFullName,
      url: "https://ai.winlab.tw",
    },
  };

  return (
    <>
      <JsonLd data={structuredData} />
      <EventDetailClient
        event={data.event}
        slug={slug}
        tab="results"
        publishedAnnouncements={data.announcements}
        publishedResults={data.results}
        publishedRecruitments={data.recruitments}
        initialMembers={data.members}
      />
    </>
  );
}
