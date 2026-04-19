import { EventDetailClient } from "./client";
import { EventDetailNotFoundClient } from "./not-found-client";
import { getEventPageData, getPublishedEventSlugs } from "./data";
import { JsonLd } from "@/components/json-ld";

export async function generateStaticParams() {
  const slugs = await getPublishedEventSlugs();
  return slugs.map((slug) => ({ slug }));
}

export default async function EventDetailPage({
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
    "@type": "Event",
    name: data.event.name,
    description: data.event.description ?? `${data.event.name} 活動頁面`,
    url: `https://ai.winlab.tw/events/${slug}`,
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    organizer: {
      "@type": "Organization",
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
        publishedAnnouncements={data.announcements}
        publishedResults={data.results}
        publishedRecruitments={data.recruitments}
        initialMembers={data.members}
      />
    </>
  );
}
