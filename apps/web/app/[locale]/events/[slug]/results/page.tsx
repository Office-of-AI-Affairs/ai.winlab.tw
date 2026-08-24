import { EventDetailClient } from "../client";
import { EventDetailNotFoundClient } from "../not-found-client";
import { getEventPageData } from "../data";
import { JsonLd } from "@/components/seo/json-ld";
import type { Metadata } from "next";
import { defaultLocale, isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { localeAlternates } from "@/lib/i18n/seo";
import { localizedField } from "@/lib/i18n/localized-field";
import { localizedPath } from "@/lib/i18n/routing";
import { OG_HEIGHT, OG_WIDTH } from "@/lib/seo/og-image";

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
  const eventName = localizedField(data.event, "name", locale).value;
  const title = dict.events.meta.resultsTitle.replace("{name}", eventName);
  const description = dict.events.meta.resultsDescription.replace("{name}", eventName);
  const a = localeAlternates(`/events/${slug}/results`, locale);
  // Next only auto-injects a sibling/ancestor `opengraph-image.tsx` file's
  // output when this segment's own metadata declares no `openGraph` object
  // at all — this page needs its own `title`/`description`/`url`, so any
  // `openGraph` object it returns fully replaces the ancestor's (object-level
  // replace, not merge; see `events/[slug]/page.tsx`'s comment) and the
  // event's branded card from `events/[slug]/opengraph-image.tsx` (#74)
  // would silently disappear. Point `images` at that same rendered card
  // directly instead of `event.cover_image` (the raw, unbranded Supabase
  // storage URL this used before #74).
  const ogImageUrl = localizedPath(`/events/${slug}/opengraph-image`, locale);
  return {
    title,
    description,
    alternates: { canonical: a.canonical, languages: a.languages },
    openGraph: {
      title,
      description,
      url: a.canonical,
      images: [{ url: ogImageUrl, width: OG_WIDTH, height: OG_HEIGHT, alt: eventName }],
    },
    twitter: { card: "summary_large_image", title, description, images: [ogImageUrl] },
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
    name: `${localizedField(data.event, "name", locale).value} ${dict.events.tabs.results}`,
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
