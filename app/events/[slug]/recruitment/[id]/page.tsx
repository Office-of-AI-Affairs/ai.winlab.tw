import { RecruitmentDetail } from "@/components/recruitment-detail";
import { composeRecruitment } from "@/lib/recruitment-records";
import { createClient } from "@/lib/supabase/server";
import type {
  Recruitment,
  RecruitmentPrivateDetails,
  RecruitmentSummary,
} from "@/lib/supabase/types";
import { redirect } from "next/navigation";

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
    .select("id, created_at, updated_at, title, link, image, company_description, start_date, end_date, event_id")
    .eq("id", id)
    .single();

  if (error || !summary) redirect(`/events/${slug}?tab=recruitment`);

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

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <RecruitmentDetail
        recruitment={recruitment as Recruitment}
        backHref={`/events/${slug}?tab=recruitment`}
        backLabel="返回活動"
        canViewPrivateDetails={Boolean(user)}
      />
    </div>
  );
}
