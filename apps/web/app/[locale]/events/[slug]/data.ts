import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { omitContent } from "@/lib/utils";
import { liveAnnouncement } from "@/lib/db/filters";
import {
  announcements,
  competitions,
  event_participants,
  events,
  public_profiles,
  result_coauthors,
  results as resultsTable,
} from "@/lib/db/schema";
import { composeRecruitment } from "@winlab/domain";
import type { ResultWithMeta } from "@/components/events/result-card";
import type {
  Announcement,
  Event,
  Recruitment,
  RecruitmentSummary,
  Result,
} from "@winlab/db";

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
// Intentionally NOT wrapped in unstable_cache: MCP tools write rows directly,
// so this page reads fresh on every request to stay in sync. Draft-only data
// (admin announcements, recruitment private details) is merged in from the
// client side — see EventDetailClient.
export async function getEventPageData(
  slug: string,
): Promise<EventPagePayload | null> {
  const [eventRow] = await db
    .select()
    .from(events)
    .where(and(eq(events.slug, slug), eq(events.status, "published")))
    .limit(1);
  if (!eventRow) return null;

  const [announcementRows, rawResults, recruitmentRows, participantRows] = await Promise.all([
    db
      .select()
      .from(announcements)
      .where(and(eq(announcements.event_id, eventRow.id), liveAnnouncement()))
      .orderBy(desc(announcements.date)),
    db
      .select()
      .from(resultsTable)
      .where(and(eq(resultsTable.event_id, eventRow.id), eq(resultsTable.status, "published")))
      .orderBy(desc(resultsTable.pinned), asc(resultsTable.created_at)),
    db
      .select({
        id: competitions.id,
        created_at: competitions.created_at,
        updated_at: competitions.updated_at,
        title: competitions.title,
        link: competitions.link,
        image: competitions.image,
        company_description: competitions.company_description,
        start_date: competitions.start_date,
        end_date: competitions.end_date,
        event_id: competitions.event_id,
        created_by: competitions.created_by,
        pinned: competitions.pinned,
      })
      .from(competitions)
      .where(eq(competitions.event_id, eventRow.id))
      .orderBy(desc(competitions.pinned), asc(competitions.created_at)),
    // has_profile_data is denormalised onto public_profiles by a trigger, so
    // members come from one public read.
    db
      .select({
        id: public_profiles.id,
        display_name: public_profiles.display_name,
        avatar_url: public_profiles.avatar_url,
        has_profile_data: public_profiles.has_profile_data,
      })
      .from(event_participants)
      .innerJoin(public_profiles, eq(public_profiles.id, event_participants.user_id))
      .where(eq(event_participants.event_id, eventRow.id)),
  ]);

  const members: EventMember[] = participantRows
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

  const resultIds = rawResults.map((r) => r.id);
  const coauthorRows = resultIds.length
    ? await db
        .select({ result_id: result_coauthors.result_id, user_id: result_coauthors.user_id })
        .from(result_coauthors)
        .where(inArray(result_coauthors.result_id, resultIds))
    : [];
  const profileIds = [
    ...new Set([
      ...rawResults.map((r) => r.author_id).filter((id): id is string => Boolean(id)),
      ...coauthorRows.map((r) => r.user_id),
    ]),
  ];
  const names = profileIds.length
    ? await db
        .select({ id: public_profiles.id, display_name: public_profiles.display_name })
        .from(public_profiles)
        .where(inArray(public_profiles.id, profileIds))
    : [];
  const profileMap = Object.fromEntries(names.map((p) => [p.id, p.display_name]));

  const coauthorsByResult = new Map<string, { id: string; name: string }[]>();
  for (const row of coauthorRows) {
    const list = coauthorsByResult.get(row.result_id) ?? [];
    list.push({ id: row.user_id, name: profileMap[row.user_id] ?? "未知使用者" });
    coauthorsByResult.set(row.result_id, list);
  }

  // The Result overlay narrows content and summary (see packages/db).
  const results: ResultWithMeta[] = (rawResults as Result[]).map((r) => ({
    ...omitContent(r),
    author_name: r.author_id ? profileMap[r.author_id] ?? null : null,
    coauthors: coauthorsByResult.get(r.id) ?? [],
  }));

  return {
    event: eventRow,
    announcements: announcementRows,
    results,
    recruitments: (recruitmentRows as RecruitmentSummary[]).map((item) => composeRecruitment(item)),
    members,
  };
}
