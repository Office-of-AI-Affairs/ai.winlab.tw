import { EventDetailClient } from "../client";
import { EventDetailNotFoundClient } from "../not-found-client";
import { getEventPageData } from "../data";
import { JsonLd } from "@/components/json-ld";
import { defaultLocale, isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { localeAlternates } from "@/lib/i18n/seo";
import type { Metadata } from "next";

// Tab-as-route: /events/[slug]/announcements. See issue #1 for the SEO
// rationale. Same shell as the other sibling tab routes — only the
// metadata + initialTab differ. dynamic="force-dynamic" inherited from
// the original /events/[slug] page for the MCP-bypass reason.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale: raw, slug } = await params;
  const locale: Locale = isLocale(raw) ? raw : defaultLocale;
  const dict = await getDictionary(locale);
  const data = await getEventPageData(slug);
  if (!data) return { title: dict.events.meta.announcementsFallbackTitle };
  const title = dict.events.meta.announcementsTitle.replace("{name}", data.event.name);
  const description = dict.events.meta.announcementsDescription.replace("{name}", data.event.name);
  const ogImages = data.event.cover_image
    ? [{ url: data.event.cover_image, width: 1200, height: 630, alt: data.event.name }]
    : [];
  const twitterImages = ogImages.length ? ogImages.map((i) => i.url) : ["/og.png"];
  const a = localeAlternates(`/events/${slug}/announcements`, locale);
  return {
    title,
    description,
    alternates: { canonical: a.canonical, languages: a.languages },
    openGraph: { title, description, url: a.canonical, images: ogImages },
    twitter: { card: "summary_large_image", title, description, images: twitterImages },
  };
}

export default async function EventAnnouncementsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getEventPageData(slug);

  if (!data) {
    return <EventDetailNotFoundClient slug={slug} />;
  }

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${data.event.name} 公告`,
    url: `https://ai.winlab.tw/events/${slug}/announcements`,
    isPartOf: {
      "@type": "WebSite",
      name: "國立陽明交通大學 人工智慧專責辦公室",
      url: "https://ai.winlab.tw",
    },
  };

  return (
    <>
      <JsonLd data={structuredData} />
      <EventDetailClient
        event={data.event}
        slug={slug}
        tab="announcements"
        publishedAnnouncements={data.announcements}
        publishedResults={data.results}
        publishedRecruitments={data.recruitments}
        initialMembers={data.members}
      />
    </>
  );
}
