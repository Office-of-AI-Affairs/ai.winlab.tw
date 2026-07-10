import { EventDetailClient } from "../client";
import { EventDetailNotFoundClient } from "../not-found-client";
import { getEventPageData } from "../data";
import { JsonLd } from "@/components/json-ld";
import type { Metadata } from "next";

// Tab-as-route: /events/[slug]/results. See issue #1.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await getEventPageData(slug);
  if (!data) return { title: "成果｜人工智慧專責辦公室" };
  const title = `${data.event.name} 成果｜人工智慧專責辦公室`;
  const description =
    `${data.event.name} 活動成果展示 — 國立陽明交通大學人工智慧專責辦公室。`;
  const ogImages = data.event.cover_image
    ? [{ url: data.event.cover_image, width: 1200, height: 630, alt: data.event.name }]
    : [];
  const twitterImages = ogImages.length ? ogImages.map((i) => i.url) : ["/og.png"];
  return {
    title,
    description,
    alternates: { canonical: `/events/${slug}/results` },
    openGraph: { title, description, url: `/events/${slug}/results`, images: ogImages },
    twitter: { card: "summary_large_image", title, description, images: twitterImages },
  };
}

export default async function EventResultsPage({
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
    name: `${data.event.name} 成果`,
    url: `https://ai.winlab.tw/events/${slug}/results`,
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
        tab="results"
        publishedAnnouncements={data.announcements}
        publishedResults={data.results}
        publishedRecruitments={data.recruitments}
        initialMembers={data.members}
      />
    </>
  );
}
