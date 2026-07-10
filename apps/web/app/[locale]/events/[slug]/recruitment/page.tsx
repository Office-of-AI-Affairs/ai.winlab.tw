import { EventDetailClient } from "../client";
import { EventDetailNotFoundClient } from "../not-found-client";
import { getEventPageData } from "../data";
import { JsonLd } from "@/components/json-ld";
import type { Metadata } from "next";

// Tab-as-route: /events/[slug]/recruitment. The keyword 徵才 lives in the
// URL slug now so the recruitment listing can rank on its own. See #1.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await getEventPageData(slug);
  if (!data) return { title: "徵才｜人工智慧專責辦公室" };
  const title = `${data.event.name} 徵才｜人工智慧專責辦公室`;
  const description =
    `${data.event.name} 合作企業招募中的 AI 人才職缺 — 國立陽明交通大學人工智慧專責辦公室。`;
  const ogImages = data.event.cover_image
    ? [{ url: data.event.cover_image, width: 1200, height: 630, alt: data.event.name }]
    : [];
  const twitterImages = ogImages.length ? ogImages.map((i) => i.url) : ["/og.png"];
  return {
    title,
    description,
    alternates: { canonical: `/events/${slug}/recruitment` },
    openGraph: { title, description, url: `/events/${slug}/recruitment`, images: ogImages },
    twitter: { card: "summary_large_image", title, description, images: twitterImages },
  };
}

export default async function EventRecruitmentPage({
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
    name: `${data.event.name} 徵才`,
    url: `https://ai.winlab.tw/events/${slug}/recruitment`,
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
        tab="recruitment"
        publishedAnnouncements={data.announcements}
        publishedResults={data.results}
        publishedRecruitments={data.recruitments}
        initialMembers={data.members}
      />
    </>
  );
}
