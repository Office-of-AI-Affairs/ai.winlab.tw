import { EventDetailClient } from "./client";
import { getViewer } from "@/lib/supabase/get-viewer";
import { composeRecruitment } from "@/lib/recruitment-records";
import type {
  Announcement,
  Event,
  Recruitment,
  RecruitmentPrivateDetails,
  RecruitmentSummary,
  Result,
} from "@/lib/supabase/types";
import type { ResultWithMeta } from "@/components/result-card";
import { redirect } from "next/navigation";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { supabase, user, isAdmin } = await getViewer();

  // Fetch event
  const eventQuery = supabase.from("events").select("*").eq("slug", slug);
  if (!user) eventQuery.eq("status", "published");
  const { data: event, error: eventError } = await eventQuery.single();
  if (eventError || !event) redirect("/events");

  // Fetch all tab data in parallel
  const announcementsQuery = supabase
    .from("announcements")
    .select("*")
    .eq("event_id", event.id)
    .order("date", { ascending: false });
  if (!user) announcementsQuery.eq("status", "published");
  else if (!isAdmin) announcementsQuery.or(`status.eq.published,and(status.eq.draft,author_id.eq.${user.id})`);

  const resultsQuery = supabase
    .from("results")
    .select("*")
    .eq("event_id", event.id)
    .order("pinned", { ascending: false })
    .order("date", { ascending: false });
  if (!user) resultsQuery.eq("status", "published");
  else if (!isAdmin) resultsQuery.or(`status.eq.published,and(status.eq.draft,author_id.eq.${user.id})`);

  const [announcementsRes, resultsRes, recruitmentsRes] = await Promise.all([
    announcementsQuery,
    resultsQuery,
    supabase
      .from("competitions")
      .select("id, created_at, updated_at, title, link, image, company_description, start_date, end_date, event_id")
      .eq("event_id", event.id)
      .order("start_date", { ascending: false }),
  ]);

  // Resolve author/team names for results
  const rawResults = (resultsRes.data as Result[]) || [];
  const authorIds = [...new Set(rawResults.map((r) => r.author_id).filter(Boolean))] as string[];
  const teamIds = [...new Set(rawResults.map((r) => r.team_id).filter(Boolean))] as string[];
  const [profilesRes, teamsRes] = await Promise.all([
    authorIds.length
      ? supabase.from("public_profiles").select("id, display_name").in("id", authorIds)
      : Promise.resolve({ data: [] }),
    teamIds.length
      ? supabase.from("teams").select("id, name").in("id", teamIds)
      : Promise.resolve({ data: [] }),
  ]);
  const profileMap = Object.fromEntries(
    ((profilesRes.data || []) as { id: string; display_name: string | null }[]).map((p) => [p.id, p.display_name])
  );
  const teamMap = Object.fromEntries(
    ((teamsRes.data || []) as { id: string; name: string }[]).map((t) => [t.id, t.name])
  );
  const results: ResultWithMeta[] = rawResults.map((r) => ({
    ...r,
    author_name: r.author_id ? profileMap[r.author_id] : null,
    team_name: r.team_id ? teamMap[r.team_id] : null,
  }));

  const recruitmentSummaries = (recruitmentsRes.data as RecruitmentSummary[]) ?? [];
  let recruitments: Recruitment[] = recruitmentSummaries.map((item) =>
    composeRecruitment(item)
  );

  if (isAdmin && recruitmentSummaries.length > 0) {
    const { data: privateRows } = await supabase
      .from("competition_private_details")
      .select("competition_id, created_at, updated_at, positions, application_method, contact, required_documents")
      .in("competition_id", recruitmentSummaries.map((item) => item.id));

    const privateMap = new Map(
      ((privateRows as RecruitmentPrivateDetails[] | null) ?? []).map((item) => [
        item.competition_id,
        item,
      ])
    );

    recruitments = recruitmentSummaries.map((item) =>
      composeRecruitment(item, privateMap.get(item.id) ?? null)
    );
  }

  return (
    <EventDetailClient
      event={event as Event}
      slug={slug}
      isAdmin={isAdmin}
      viewerUserId={user?.id ?? null}
      announcements={(announcementsRes.data as Announcement[]) ?? []}
      results={results}
      recruitments={recruitments}
    />
  );
}
