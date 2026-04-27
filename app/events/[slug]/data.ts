import { createPublicClient } from "@/lib/supabase/public";
import { composeRecruitment } from "@/lib/recruitment-records";
import type { ResultWithMeta } from "@/components/result-card";
import type {
  Announcement,
  Event,
  Recruitment,
  RecruitmentSummary,
  Result,
} from "@/lib/supabase/types";

export type EventMember = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  hasProfileData: boolean;
};

export type EventPagePayload = {
  event: Event;
  announcements: Announcement[];
  results: ResultWithMeta[];
  recruitments: Recruitment[];
  members: EventMember[];
};

// Everything the public /events/[slug] render needs.
// Intentionally NOT wrapped in unstable_cache: the MCP server writes directly
// to Supabase (bypassing Server Actions / updateTag), so this page reads fresh
// on every request to stay in sync. Draft-only data (admin announcements,
// admin-only recruitment private details) is merged in from the client side —
// see EventDetailClient.
export async function getEventPageData(
  slug: string,
): Promise<EventPagePayload | null> {
    const supabase = createPublicClient();

    const { data: event } = await supabase
      .from("events")
      .select(
        "id, slug, name, description, cover_image, status, pinned, sort_order, created_at, updated_at",
      )
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();
    if (!event) return null;
    const eventRow = event as Event;

    const [announcementsRes, resultsRes, recruitmentsRes, participantsRes] = await Promise.all([
      supabase
        .from("announcements")
        .select(
          "id, event_id, title, category, date, content, status, author_id, created_at, updated_at",
        )
        .eq("event_id", eventRow.id)
        .eq("status", "published")
        .order("date", { ascending: false }),
      supabase
        .from("results")
        .select(
          "id, event_id, type, title, summary, content, header_image, date, pinned, status, author_id, team_id, created_at, updated_at",
        )
        .eq("event_id", eventRow.id)
        .eq("status", "published")
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: true }),
      supabase
        .from("competitions")
        .select("id, created_at, updated_at, title, link, image, company_description, start_date, end_date, event_id, created_by, pinned")
        .eq("event_id", eventRow.id)
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: true }),
      supabase.from("event_participants").select("user_id").eq("event_id", eventRow.id),
    ]);

    const participantUserIds = (participantsRes.data ?? []).map(
      (row: { user_id: string }) => row.user_id,
    );
    // has_profile_data is denormalised onto public_profiles by a trigger, so
    // this one public read replaces the authenticated profiles query the
    // original page did — critical for the SSG fetcher.
    const { data: participantPublic } = participantUserIds.length
      ? await supabase
          .from("public_profiles")
          .select("id, display_name, avatar_url, has_profile_data")
          .in("id", participantUserIds)
      : { data: [] };

    const members: EventMember[] = (
      (participantPublic as {
        id: string;
        display_name: string | null;
        avatar_url: string | null;
        has_profile_data: boolean;
      }[]) ?? []
    )
      .map((m) => ({
        id: m.id,
        display_name: m.display_name,
        avatar_url: m.avatar_url,
        hasProfileData: m.has_profile_data,
      }))
      .sort((a, b) => {
        if (a.hasProfileData !== b.hasProfileData) return a.hasProfileData ? -1 : 1;
        return (a.display_name ?? "").localeCompare(b.display_name ?? "");
      });

    const rawResults = (resultsRes.data as Result[]) ?? [];
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
      (((profilesRes.data as unknown) as { id: string; display_name: string | null }[]) ?? []).map(
        (p) => [p.id, p.display_name],
      ),
    );
    const teamMap = Object.fromEntries(
      (((teamsRes.data as unknown) as { id: string; name: string }[]) ?? []).map((t) => [t.id, t.name]),
    );

    const resultIds = rawResults.map((r) => r.id);
    const { data: coauthorRows } = resultIds.length
      ? await supabase.from("result_coauthors").select("result_id, user_id").in("result_id", resultIds)
      : { data: [] };
    const coauthorUserIds = [...new Set((coauthorRows ?? []).map((r) => r.user_id))];
    if (coauthorUserIds.length) {
      const { data: coProfiles } = await supabase
        .from("public_profiles")
        .select("id, display_name")
        .in("id", coauthorUserIds);
      for (const p of (coProfiles as { id: string; display_name: string | null }[]) ?? []) {
        if (!profileMap[p.id]) profileMap[p.id] = p.display_name;
      }
    }
    const coauthorsByResult = new Map<string, { id: string; name: string }[]>();
    for (const row of (coauthorRows ?? []) as { result_id: string; user_id: string }[]) {
      const list = coauthorsByResult.get(row.result_id) ?? [];
      list.push({ id: row.user_id, name: profileMap[row.user_id] ?? "未知使用者" });
      coauthorsByResult.set(row.result_id, list);
    }

    const results: ResultWithMeta[] = rawResults.map((r) => ({
      ...r,
      author_name: r.author_id ? profileMap[r.author_id] ?? null : null,
      team_name: r.team_id ? teamMap[r.team_id] ?? null : null,
      coauthors: coauthorsByResult.get(r.id) ?? [],
    }));

    const recruitments: Recruitment[] = ((recruitmentsRes.data as RecruitmentSummary[]) ?? []).map(
      (item) => composeRecruitment(item),
    );

    return {
      event: eventRow,
      announcements: (announcementsRes.data as Announcement[]) ?? [],
      results,
      recruitments,
      members,
    };
}
