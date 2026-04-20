import { EventDetailClient } from "./client";
import { EventDetailNotFoundClient } from "./not-found-client";
import { getEventPageData } from "./data";
import { JsonLd } from "@/components/json-ld";

// MCP server writes directly to Supabase, bypassing Next.js Server Actions and
// updateTag(). Force dynamic rendering so admin edits made through MCP show up
// on the next visit instead of waiting for the 1h ISR fallback.
export const dynamic = "force-dynamic";

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
