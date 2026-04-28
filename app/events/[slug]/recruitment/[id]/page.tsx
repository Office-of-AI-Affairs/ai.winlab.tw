import { RecruitmentDetail } from "@/components/recruitment-detail";
import { RecruitmentInterestButton } from "@/components/recruitment-interest-button";
import { RecruitmentInterestList } from "@/components/recruitment-interest-list";
import { JsonLd } from "@/components/json-ld";
import { buildBreadcrumbJsonLd } from "@/lib/seo/breadcrumb";
import { composeRecruitment } from "@/lib/recruitment-records";
import { isRecruitmentOwner } from "@/lib/supabase/check-recruitment-owner";
import { createClient } from "@/lib/supabase/server";
import type {
  Recruitment,
  RecruitmentPrivateDetails,
  RecruitmentSummary,
} from "@/lib/supabase/types";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}): Promise<Metadata> {
  const { slug, id } = await params;
  const supabase = await createClient();
  const [competitionRes, eventRes] = await Promise.all([
    supabase
      .from("competitions")
      .select("title, company_description, image")
      .eq("id", id)
      .single(),
    supabase.from("events").select("cover_image").eq("slug", slug).single(),
  ]);
  const title = competitionRes.data?.title ?? "徵才資訊";
  const description =
    competitionRes.data?.company_description ?? `${title}｜國立陽明交通大學人工智慧專責辦公室活動徵才資訊`;
  const ogImageUrl = competitionRes.data?.image ?? eventRes.data?.cover_image ?? null;
  const ogImages = ogImageUrl
    ? [{ url: ogImageUrl, width: 1200, height: 630, alt: title }]
    : [];
  const twitterImages = ogImages.length ? ogImages.map((i) => i.url) : ["/og.png"];

  return {
    title: `${title}｜人工智慧專責辦公室`,
    description,
    alternates: {
      canonical: `/events/${slug}/recruitment/${id}`,
    },
    openGraph: {
      title: `${title}｜人工智慧專責辦公室`,
      description,
      url: `/events/${slug}/recruitment/${id}`,
      images: ogImages,
    },
    twitter: {
      card: "summary_large_image",
      title: `${title}｜人工智慧專責辦公室`,
      description,
      images: twitterImages,
    },
  };
}

export default async function EventRecruitmentDetailPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: summary, error } = await supabase
    .from("competitions")
    .select("id, created_at, updated_at, title, link, image, company_description, start_date, end_date, event_id, created_by")
    .eq("id", id)
    .single();

  if (error || !summary) redirect(`/events/${slug}?tab=recruitment`);

  if (!summary.event_id) redirect(`/events/${slug}?tab=recruitment`);

  let details: RecruitmentPrivateDetails | null = null;
  if (user) {
    const { data, error: detailsError } = await supabase
      .from("competition_private_details")
      .select("competition_id, created_at, updated_at, positions, application_method, contact, required_documents")
      .eq("competition_id", id)
      .maybeSingle();
    if (detailsError) console.error("Failed to fetch competition_private_details:", detailsError);
    details = (data as RecruitmentPrivateDetails | null) ?? null;
  }

  const recruitment: Recruitment = composeRecruitment(
    summary as RecruitmentSummary,
    details
  );

  // Determine viewer role
  let isAdmin = false;
  let isOwner = false;
  let hasResume = false;

  if (user) {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, resume")
      .eq("id", user.id)
      .single();
    if (profileError) console.error("Failed to fetch viewer profile:", profileError);

    if (profile) {
      isAdmin = profile.role === "admin";
      hasResume = Boolean(profile.resume);
      if (!isAdmin) {
        isOwner = await isRecruitmentOwner(supabase, user.id, id);
      }
    }
  }

  const canViewApplicants = isAdmin || isOwner;

  // Fetch interest count
  const { data: countData, error: countError } = await supabase.rpc("get_interest_count", {
    p_competition_id: id,
  });
  if (countError) console.error("Failed to fetch interest count:", countError);
  const interestCount = (countData as number | null) ?? 0;

  // Check if current user is already interested
  let userIsInterested = false;
  if (user && !canViewApplicants) {
    const { data: interestRow, error: interestError } = await supabase
      .from("recruitment_interests")
      .select("id")
      .eq("competition_id", id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (interestError) console.error("Failed to check user interest:", interestError);
    userIsInterested = Boolean(interestRow);
  }

  // Fetch applicant list for vendor/admin
  type ApplicantRow = {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    bio: string | null;
    resume: string | null;
  };
  let applicants: ApplicantRow[] = [];
  if (canViewApplicants) {
    const { data: interestRows, error: interestListError } = await supabase
      .from("recruitment_interests")
      .select("user_id")
      .eq("competition_id", id);
    if (interestListError) console.error("Failed to fetch interest list:", interestListError);

    if (interestRows && interestRows.length > 0) {
      const userIds = interestRows.map((r) => r.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, bio, resume")
        .in("id", userIds);
      if (profilesError) console.error("Failed to fetch applicant profiles:", profilesError);
      applicants = (profiles as ApplicantRow[]) ?? [];
    }
  }

  // Sanitized positions (name/type/location/count only) — readable by anon
  // via SECURITY DEFINER RPC so JobPosting JSON-LD stays complete for
  // unauthenticated crawlers.
  const { data: publicPositionsData } = await supabase.rpc(
    "get_public_recruitment_positions",
    { p_competition_id: id }
  );
  type PublicPosition = { name: string | null; type: string | null; location: string | null; count: number | null };
  const publicPositions: PublicPosition[] = Array.isArray(publicPositionsData)
    ? (publicPositionsData as PublicPosition[])
    : [];

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
      recruitment.company_description ?? `${recruitment.title}｜活動徵才資訊`,
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

  const { data: eventRow } = await supabase
    .from("events")
    .select("name")
    .eq("slug", slug)
    .maybeSingle();
  const eventName = eventRow?.name ?? "活動";
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "首頁", path: "/" },
    { name: "活動", path: "/events" },
    { name: eventName, path: `/events/${slug}` },
    { name: recruitment.title, path: `/events/${slug}/recruitment/${id}` },
  ]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <JsonLd data={structuredData} />
      <JsonLd data={breadcrumbJsonLd} />
      <RecruitmentDetail
        recruitment={recruitment as Recruitment}
        backHref={`/events/${slug}?tab=recruitment`}
        backLabel="返回活動"
        canViewPrivateDetails={Boolean(user)}
      />

      {user && !canViewApplicants && (
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
    </div>
  );
}
