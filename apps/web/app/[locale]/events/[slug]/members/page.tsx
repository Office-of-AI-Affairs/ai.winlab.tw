import { EventDetailClient } from "../client";
import { EventDetailNotFoundClient } from "../not-found-client";
import { getEventPageData } from "../data";
import { defaultLocale, isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { localeAlternates } from "@/lib/i18n/seo";
import type { Metadata } from "next";

// Tab-as-route: /events/[slug]/members. Members content is auth-gated in
// the client (signed-out viewers see a blank panel), so we mark the route
// noindex to keep the URL out of the sitemap-but-empty trap.
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
  if (!data)
    return {
      title: dict.events.meta.membersFallbackTitle,
      robots: { index: false, follow: false },
    };
  const title = dict.events.meta.membersTitle.replace("{name}", data.event.name);
  const a = localeAlternates(`/events/${slug}/members`, locale);
  return {
    title,
    alternates: { canonical: a.canonical, languages: a.languages },
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
