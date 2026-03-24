import { RecruitmentDetail } from "@/components/recruitment-detail";
import { RecruitmentInterestButton } from "@/components/recruitment-interest-button";
import { RecruitmentInterestList } from "@/components/recruitment-interest-list";
import { JsonLd } from "@/components/json-ld";
import { composeRecruitment } from "@/lib/recruitment-records";
import { isEventVendor } from "@/lib/supabase/check-event-vendor";
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
  const { data } = await supabase
    .from("competitions")
    .select("title, company_description")
    .eq("id", id)
    .single();
  const title = data?.title ?? "徵才資訊";
  const description =
    data?.company_description ?? `${title}｜國立陽明交通大學人工智慧專責辦公室活動徵才資訊`;

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

  const eventId = summary.event_id as string;

  let details: RecruitmentPrivateDetails | null = null;
  if (user) {
    const { data } = await supabase
      .from("competition_private_details")
      .select("competition_id, created_at, updated_at, positions, application_method, contact, required_documents")
      .eq("competition_id", id)
      .maybeSingle();
    details = (data as RecruitmentPrivateDetails | null) ?? null;
  }

  const recruitment: Recruitment = composeRecruitment(
    summary as RecruitmentSummary,
    details
  );

  // Determine viewer role
  let isAdmin = false;
  let isVendor = false;
  let hasResume = false;

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, resume")
      .eq("id", user.id)
      .single();

    if (profile) {
      isAdmin = profile.role === "admin";
      hasResume = Boolean(profile.resume);
      if (!isAdmin && profile.role === "vendor") {
        isVendor = await isEventVendor(supabase, user.id, eventId);
      }
    }
  }

  const canViewApplicants = isAdmin || isVendor;

  // Fetch interest count
  const { data: countData } = await supabase.rpc("get_interest_count", {
    p_competition_id: id,
  });
  const interestCount = (countData as number | null) ?? 0;

  // Check if current user is already interested
  let userIsInterested = false;
  if (user && !canViewApplicants) {
    const { data: interestRow } = await supabase
      .from("recruitment_interests")
      .select("id")
      .eq("competition_id", id)
      .eq("user_id", user.id)
      .maybeSingle();
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
    const { data: interestRows } = await supabase
      .from("recruitment_interests")
      .select("user_id")
      .eq("competition_id", id);

    if (interestRows && interestRows.length > 0) {
      const userIds = interestRows.map((r) => r.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, bio, resume")
        .in("id", userIds);
      applicants = (profiles as ApplicantRow[]) ?? [];
    }
  }

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: recruitment.title,
    description:
      recruitment.company_description ?? `${recruitment.title}｜活動徵才資訊`,
    datePosted: recruitment.start_date,
    validThrough: recruitment.end_date ?? undefined,
    url: `https://ai.winlab.tw/events/${slug}/recruitment/${id}`,
    hiringOrganization: {
      "@type": "Organization",
      name: "國立陽明交通大學 人工智慧專責辦公室",
      url: "https://ai.winlab.tw",
    },
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <JsonLd data={structuredData} />
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
