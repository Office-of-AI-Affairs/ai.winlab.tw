"use server";

import { and, desc, eq, inArray } from "drizzle-orm";
import type { ResultWithMeta } from "@/components/events/result-card";
import { actor, getViewer } from "@/lib/auth/viewer";
import { asUser, db } from "@/lib/db";
import {
  announcements,
  competition_owners,
  competition_private_details,
  event_participants,
  public_profiles,
  result_coauthors,
  results,
} from "@/lib/db/schema";
import { isUuid } from "@/lib/slug";
import type { Announcement, RecruitmentPrivateDetails, Result } from "@winlab/db";

export type Done = { ok: true } | { ok: false; error: string };

/** "event_participants_insert": admins only. */
export async function addEventMember(eventId: string, userId: string): Promise<Done> {
  const viewer = await actor("admin");
  if (!isUuid(eventId) || !isUuid(userId)) return { ok: false, error: "Invalid id" };
  await asUser(viewer.id, (tx) =>
    tx.insert(event_participants).values({ event_id: eventId, user_id: userId }).onConflictDoNothing(),
  );
  return { ok: true };
}

/** "event_participants_delete": admins only. */
export async function removeEventMember(eventId: string, userId: string): Promise<Done> {
  const viewer = await actor("admin");
  if (!isUuid(eventId) || !isUuid(userId)) return { ok: false, error: "Invalid id" };
  await asUser(viewer.id, (tx) =>
    tx
      .delete(event_participants)
      .where(and(eq(event_participants.event_id, eventId), eq(event_participants.user_id, userId))),
  );
  return { ok: true };
}

export type EventViewerData = {
  draftAnnouncements: Announcement[];
  draftResults: ResultWithMeta[];
  /** Recruitments in this event the viewer owns (admins: empty, they edit all). */
  ownedRecruitmentIds: string[];
  /** Private details of the recruitments the viewer may edit. */
  privateDetails: RecruitmentPrivateDetails[];
};

const EMPTY: EventViewerData = { draftAnnouncements: [], draftResults: [], ownedRecruitmentIds: [], privateDetails: [] };

/**
 * What /events/[slug] adds for a signed-in viewer on top of the public page:
 * drafts they may see and the recruitment details they may edit. Admins see
 * every draft; others see their own drafts (the page's old client filter,
 * narrowed by RLS).
 */
export async function getEventViewerData(eventId: string, recruitmentIds: string[]): Promise<EventViewerData> {
  const viewer = await getViewer();
  if (!viewer || !isUuid(eventId)) return EMPTY;
  const isAdmin = viewer.role === "admin";

  // Announcement drafts were readable only by admins and editors (RLS);
  // the page also limited non-admins to their own.
  const draftAnnouncements =
    isAdmin || viewer.role === "editor"
      ? ((await db
          .select()
          .from(announcements)
          .where(
            and(
              eq(announcements.event_id, eventId),
              eq(announcements.status, "draft"),
              isAdmin ? undefined : eq(announcements.author_id, viewer.id),
            ),
          )
          .orderBy(desc(announcements.date))) as Announcement[])
      : [];

  const rawDrafts = (await db
    .select()
    .from(results)
    .where(
      and(
        eq(results.event_id, eventId),
        eq(results.status, "draft"),
        isAdmin ? undefined : eq(results.author_id, viewer.id),
      ),
    )) as Result[];
  const draftResults = await withAuthorsAndCoauthors(rawDrafts);

  const ids = (Array.isArray(recruitmentIds) ? recruitmentIds : []).filter(isUuid);
  let ownedRecruitmentIds: string[] = [];
  if (!isAdmin && ids.length) {
    const owned = await db
      .select({ id: competition_owners.competition_id })
      .from(competition_owners)
      .where(and(eq(competition_owners.user_id, viewer.id), inArray(competition_owners.competition_id, ids)));
    ownedRecruitmentIds = owned.map((r) => r.id);
  }
  const editable = isAdmin ? ids : ownedRecruitmentIds;
  const privateDetails = editable.length
    ? ((await db
        .select({
          competition_id: competition_private_details.competition_id,
          created_at: competition_private_details.created_at,
          updated_at: competition_private_details.updated_at,
          positions: competition_private_details.positions,
          application_method: competition_private_details.application_method,
          contact: competition_private_details.contact,
          required_documents: competition_private_details.required_documents,
        })
        .from(competition_private_details)
        .where(inArray(competition_private_details.competition_id, editable))) as RecruitmentPrivateDetails[])
    : [];

  return { draftAnnouncements, draftResults, ownedRecruitmentIds, privateDetails };
}

async function withAuthorsAndCoauthors(rows: Result[]): Promise<ResultWithMeta[]> {
  if (rows.length === 0) return [];
  const coauthorRows = await db
    .select({ result_id: result_coauthors.result_id, user_id: result_coauthors.user_id })
    .from(result_coauthors)
    .where(
      inArray(
        result_coauthors.result_id,
        rows.map((r) => r.id),
      ),
    );
  const ids = [
    ...new Set([
      ...rows.map((r) => r.author_id).filter((id): id is string => Boolean(id)),
      ...coauthorRows.map((r) => r.user_id),
    ]),
  ];
  const names = ids.length
    ? await db
        .select({ id: public_profiles.id, display_name: public_profiles.display_name })
        .from(public_profiles)
        .where(inArray(public_profiles.id, ids))
    : [];
  const nameMap = Object.fromEntries(names.map((p) => [p.id, p.display_name]));
  const coauthors = new Map<string, { id: string; name: string }[]>();
  for (const row of coauthorRows) {
    const list = coauthors.get(row.result_id) ?? [];
    list.push({ id: row.user_id, name: nameMap[row.user_id] ?? "未知使用者" });
    coauthors.set(row.result_id, list);
  }
  return rows.map((r) => ({
    ...r,
    author_name: r.author_id ? nameMap[r.author_id] ?? null : null,
    coauthors: coauthors.get(r.id) ?? [],
  }));
}
