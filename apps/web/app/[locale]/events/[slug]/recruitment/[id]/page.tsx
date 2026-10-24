import { RecruitmentDetail } from "@/components/events/recruitment-detail";
import { RecruitmentInterestButton } from "@/components/events/recruitment-interest-button";
import { RecruitmentInterestList } from "@/components/events/recruitment-interest-list";
import { JsonLd } from "@/components/seo/json-ld";
import { buildBreadcrumbJsonLd } from "@/lib/seo/breadcrumb";
import { composeRecruitment } from "@winlab/domain";
import { getViewer } from "@/lib/auth/viewer";
import { getRecruitmentMeta, getRecruitmentPageData } from "@/lib/data/recruitment";
import type { Recruitment } from "@winlab/db";
import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/site";
import { redirect } from "next/navigation";
import { RecruitmentEditAffordance } from "./edit-affordance-client";
import { defaultLocale, isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { localeAlternates, ogLocale } from "@/lib/i18n/seo";
import { localizedField } from "@/lib/i18n/localized-field";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; id: string; locale: string }>;
}): Promise<Metadata> {
  const { slug, id, locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : defaultLocale;
  const dict = await getDictionary(locale);
  const meta = await getRecruitmentMeta(id, slug);
  const title = meta.competition?.title ?? dict.recruitment.meta.fallbackTitle;
  const description =
    meta.competition?.company_description ??
    dict.recruitment.meta.fallbackDescription.replace("{title}", title);
  const ogImageUrl = meta.competition?.image ?? meta.eventCover ?? null;
  const ogImages = ogImageUrl
    ? [{ url: ogImageUrl, width: 1200, height: 630, alt: title }]
    : [{ url: "/og.png", width: 1200, height: 630, alt: title }];
  const twitterImages = ogImages.map((i) => i.url);

  const metaTitle = `${title}${dict.events.meta.titleSuffix}`;
  const a = localeAlternates(`/events/${slug}/recruitment/${id}`, locale);

  return {
    title: metaTitle,
    description,
    alternates: {
      canonical: a.canonical,
      languages: a.languages,
    },
    // Next.js App Router performs object-level replace (not deep merge) when a
    // child segment exports openGraph. All required fields must be declared here
    // explicitly; relying on layout.tsx inheritance silently drops og:type /
    // og:site_name / og:locale.
    openGraph: {
      type: "article",
      siteName: SITE_NAME,
      locale: ogLocale(locale),
      title: metaTitle,
      description,
      url: a.canonical,
      images: ogImages,
    },
    twitter: {
      card: "summary_large_image",
      title: metaTitle,
      description,
      images: twitterImages,
    },
  };
}

export default async function EventRecruitmentDetailPage({
  params,
}: {
  params: Promise<{ slug: string; id: string; locale: string }>;
}) {
  const { slug, id, locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : defaultLocale;
  const dict = await getDictionary(locale);
  const viewer = await getViewer();
  const data = await getRecruitmentPageData(id, slug, viewer);
  if (!data) redirect(`/events/${slug}/recruitment`);
  const { summary, interestCount, userIsInterested, applicants, publicPositions, hasResume } = data;
  const recruitment: Recruitment = composeRecruitment(summary, data.details);
  const canViewApplicants = data.isAdmin || data.isOwner;

  const employmentTypeMap: Record<string, string> = {
    full_time: "FULL_TIME",
    part_time: "PART_TIME",
    internship: "INTERN",
    remote: "FULL_TIME",
  };
  const employmentTypes = [
    ...new Set(
      publicPositions
        .map((p) => (p.type ? employmentTypeMap[p.type] : undefined))
        .filter((v): v is string => Boolean(v))
    ),
  ];
  const positionLocations = [
    ...new Set(
      publicPositions
        .map((p) => p.location)
        .filter((l): l is string => Boolean(l))
    ),
  ];

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: recruitment.title,
    description:
      recruitment.company_description ??
      dict.recruitment.meta.fallbackDescription.replace("{title}", recruitment.title),
    datePosted: recruitment.start_date,
    validThrough: recruitment.end_date ?? undefined,
    url: `https://ai.winlab.tw/events/${slug}/recruitment/${id}`,
    directApply: false,
    hiringOrganization: {
      "@type": "Organization",
      name: recruitment.title,
      sameAs: recruitment.link ?? undefined,
    },
    jobLocation: positionLocations.length
      ? positionLocations.map((loc) => ({
          "@type": "Place",
          address: { "@type": "PostalAddress", addressLocality: loc, addressCountry: "TW" },
        }))
      : { "@type": "Place", address: { "@type": "PostalAddress", addressCountry: "TW" } },
    ...(employmentTypes.length ? { employmentType: employmentTypes } : {}),
  };

  const eventName = data.eventName
    ? localizedField(data.eventName, "name", locale).value
    : dict.events.meta.fallbackName;
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: dict.common.home, path: "/" },
    { name: dict.events.meta.fallbackName, path: "/events" },
    { name: eventName, path: `/events/${slug}` },
    { name: recruitment.title, path: `/events/${slug}/recruitment/${id}` },
  ]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <JsonLd data={structuredData} />
      <JsonLd data={breadcrumbJsonLd} />
      <RecruitmentDetail
        recruitment={recruitment as Recruitment}
        backHref={`/events/${slug}/recruitment`}
        backLabel={dict.events.backToEvent}
        canViewPrivateDetails={Boolean(viewer)}
        t={dict.recruitment}
      />

      {viewer && !canViewApplicants && (
        <RecruitmentInterestButton
          competitionId={id}
          initialInterested={userIsInterested}
          initialCount={interestCount}
          hasResume={hasResume}
        />
      )}

      {canViewApplicants && (
        <RecruitmentInterestList
          applicants={applicants}
          count={interestCount}
        />
      )}

      {canViewApplicants && (
        <RecruitmentEditAffordance
          recruitment={recruitment as Recruitment}
          eventId={summary.event_id}
        />
      )}
    </div>
  );
}
