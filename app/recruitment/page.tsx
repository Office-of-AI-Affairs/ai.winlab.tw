import { RecruitmentPageClient } from "./client";
import { PageShell } from "@/components/page-shell";
import { composeRecruitment } from "@/lib/recruitment-records";
import { createClient } from "@/lib/supabase/server";
import type {
  Recruitment,
  RecruitmentPrivateDetails,
  RecruitmentSummary,
} from "@/lib/supabase/types";

export default async function RecruitmentPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isAdmin = false;
  if (user) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    isAdmin = profile?.role === "admin";
  }

  const { data } = await supabase
    .from("competitions")
    .select("id, created_at, updated_at, title, link, image, company_description, start_date, end_date, event_id")
    .is("event_id", null)
    .order("start_date", { ascending: false });

  const summaries = (data as RecruitmentSummary[]) ?? [];
  let recruitments: Recruitment[] = summaries.map((item) => composeRecruitment(item));

  if (isAdmin && summaries.length > 0) {
    const { data: privateRows } = await supabase
      .from("competition_private_details")
      .select("competition_id, created_at, updated_at, positions, application_method, contact, required_documents")
      .in("competition_id", summaries.map((item) => item.id));

    const privateMap = new Map(
      ((privateRows as RecruitmentPrivateDetails[] | null) ?? []).map((item) => [
        item.competition_id,
        item,
      ])
    );

    recruitments = summaries.map((item) =>
      composeRecruitment(item, privateMap.get(item.id) ?? null)
    );
  }

  return (
    <PageShell>
      <RecruitmentPageClient recruitments={recruitments} isAdmin={isAdmin} />
    </PageShell>
  );
}
