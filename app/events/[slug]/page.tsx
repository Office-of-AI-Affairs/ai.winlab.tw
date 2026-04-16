import { EventDetailClient } from "./client";
import { JsonLd } from "@/components/json-ld";
import { getViewer } from "@/lib/supabase/get-viewer";
import { composeRecruitment } from "@/lib/recruitment-records";
import { isEventVendor } from "@/lib/supabase/check-event-vendor";
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
  if (!isAdmin) eventQuery.eq("status", "published");
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
    .order("created_at", { ascending: true });
  if (!user) resultsQuery.eq("status", "published");
  else if (!isAdmin) resultsQuery.or(`status.eq.published,and(status.eq.draft,author_id.eq.${user.id})`);

  const [announcementsRes, resultsRes, recruitmentsRes, participantsRes] = await Promise.all([
    announcementsQuery,
    resultsQuery,
    supabase
      .from("competitions")
      .select("id, created_at, updated_at, title, link, image, company_description, start_date, end_date, event_id, created_by, pinned")
      .eq("event_id", event.id)
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: true }),
    supabase
      .from("event_participants")
      .select("user_id")
      .eq("event_id", event.id),
  ]);

  // Resolve participant display names + check profile completeness
  const participantUserIds = (participantsRes.data ?? []).map((p: { user_id: string }) => p.user_id);
  const [{ data: participantProfiles }, { data: memberProfileData }] = participantUserIds.length
    ? await Promise.all([
        supabase.from("public_profiles").select("id, display_name, avatar_url").in("id", participantUserIds),
        supabase.from("profiles").select("id, bio, phone, linkedin, facebook, github, website, resume, social_links").in("id", participantUserIds),
      ])
    : [{ data: [] }, { data: [] }];
  const hasProfileDataSet = new Set(
    ((memberProfileData as { id: string; bio: string | null; phone: string | null; linkedin: string | null; facebook: string | null; github: string | null; website: string | null; resume: string | null; social_links: string[] | null }[]) ?? [])
      .filter((p) => p.bio || p.phone || p.linkedin || p.facebook || p.github || p.website || p.resume || (p.social_links && p.social_links.length > 0))
      .map((p) => p.id),
  );
  const members = (participantProfiles as { id: string; display_name: string | null; avatar_url: string | null }[] ?? [])
    .map((m) => ({ ...m, hasProfileData: hasProfileDataSet.has(m.id) }))
    .sort((a, b) => {
      if (a.hasProfileData !== b.hasProfileData) return a.hasProfileData ? -1 : 1;
      return (a.display_name ?? "").localeCompare(b.display_name ?? "");
    });

  // Resolve author/team names for results
  const rawResults = (resultsRes.data as Result[]) || [];
  const authorIds = [...new Set(rawResults.map((r) => r.author_id).filter(Boolean))] as string[];
  const teamIds = [...new Set(rawResults.map((r) => r.team_id).filter(Boolean))] as string[];
  const [profilesRes, teamsRes] = await Promise.all([
    authorIds.length
      ? supabase.from("public_profiles").select("id, display_name").in("id", authorIds)
      : Promise.resolve({ data: [] }),
    teamIds.length
      ? supabase.from("public_teams").select("id, name").in("id", teamIds)
      : Promise.resolve({ data: [] }),
  ]);
  const profileMap = Object.fromEntries(
    ((profilesRes.data || []) as { id: string; display_name: string | null }[]).map((p) => [p.id, p.display_name])
  );
  const teamMap = Object.fromEntries(
    ((teamsRes.data || []) as { id: string; name: string }[]).map((t) => [t.id, t.name])
  );
  // Fetch co-authors for all results
  const resultIds = rawResults.map((r) => r.id);
  const { data: allCoauthorRows } = resultIds.length
    ? await supabase.from("result_coauthors").select("result_id, user_id").in("result_id", resultIds)
    : { data: [] };
  const coauthorUserIds = [...new Set((allCoauthorRows ?? []).map((r) => r.user_id))];
  if (coauthorUserIds.length) {
    const { data: coProfiles } = await supabase.from("public_profiles").select("id, display_name").in("id", coauthorUserIds);
    for (const p of coProfiles ?? []) {
      if (!profileMap[p.id]) profileMap[p.id] = (p as { id: string; display_name: string | null }).display_name;
    }
  }
  const coauthorsByResult = new Map<string, { id: string; name: string }[]>();
  for (const row of allCoauthorRows ?? []) {
    const list = coauthorsByResult.get(row.result_id) ?? [];
    list.push({ id: row.user_id, name: profileMap[row.user_id] ?? "未知使用者" });
    coauthorsByResult.set(row.result_id, list);
  }

  const results: ResultWithMeta[] = rawResults.map((r) => ({
    ...r,
    author_name: r.author_id ? profileMap[r.author_id] : null,
    team_name: r.team_id ? teamMap[r.team_id] : null,
    coauthors: coauthorsByResult.get(r.id) ?? [],
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

  const vendorForEvent = user && !isAdmin
    ? await isEventVendor(supabase, user.id, event.id)
    : false;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: (event as Event).name,
    description: (event as Event).description ?? `${(event as Event).name} 活動頁面`,
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
        event={event as Event}
        slug={slug}
        isAdmin={isAdmin}
        isEventVendor={vendorForEvent}
        userId={user?.id ?? null}
        announcements={(announcementsRes.data as Announcement[]) ?? []}
        results={results}
        recruitments={recruitments}
        members={members}
      />
    </>
  );
}
