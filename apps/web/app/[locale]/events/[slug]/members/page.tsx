import { EventDetailClient } from "../client";
import { EventDetailNotFoundClient } from "../not-found-client";
import { getEventPageData } from "../data";
import type { Metadata } from "next";

// Tab-as-route: /events/[slug]/members. Members content is auth-gated in
// the client (signed-out viewers see a blank panel), so we mark the route
// noindex to keep the URL out of the sitemap-but-empty trap.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await getEventPageData(slug);
  if (!data) return { title: "學員名單｜人工智慧專責辦公室", robots: { index: false, follow: false } };
  const title = `${data.event.name} 學員名單｜人工智慧專責辦公室`;
  return {
    title,
    alternates: { canonical: `/events/${slug}/members` },
    robots: { index: false, follow: false },
  };
}

export default async function EventMembersPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getEventPageData(slug);

  if (!data) {
    return <EventDetailNotFoundClient slug={slug} />;
  }

  return (
    <EventDetailClient
      event={data.event}
      slug={slug}
      tab="members"
      publishedAnnouncements={data.announcements}
      publishedResults={data.results}
      publishedRecruitments={data.recruitments}
      initialMembers={data.members}
    />
  );
}
