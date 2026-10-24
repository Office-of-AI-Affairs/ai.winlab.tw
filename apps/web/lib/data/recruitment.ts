import "server-only";
import { and, count, eq, inArray, sql } from "drizzle-orm";
import type { Viewer } from "@/lib/auth/viewer";
import { db } from "@/lib/db";
import {
  competition_owners,
  competition_private_details,
  competitions,
  events,
  profiles,
  recruitment_interests,
} from "@/lib/db/schema";
import { isUuid } from "@/lib/slug";
import type { RecruitmentPrivateDetails, RecruitmentSummary } from "@winlab/db";

const summaryColumns = {
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
};

/** "Owner or admin": competition_owners is the source of truth, not created_by. */
export async function isRecruitmentOwner(userId: string, competitionId: string): Promise<boolean> {
  if (!isUuid(competitionId)) return false;
  const [row] = await db
    .select({ id: competition_owners.competition_id })
    .from(competition_owners)
    .where(and(eq(competition_owners.competition_id, competitionId), eq(competition_owners.user_id, userId)))
    .limit(1);
  return Boolean(row);
}

export async function getRecruitmentMeta(id: string, eventSlug: string) {
  const [competition] = isUuid(id)
    ? await db
        .select({ title: competitions.title, company_description: competitions.company_description, image: competitions.image })
        .from(competitions)
        .where(eq(competitions.id, id))
        .limit(1)
    : [];
  const [event] = await db
    .select({ cover_image: events.cover_image })
    .from(events)
    .where(and(eq(events.slug, eventSlug), eq(events.status, "published")))
    .limit(1);
  return { competition: competition ?? null, eventCover: event?.cover_image ?? null };
}

export type Applicant = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  resume: string | null;
};

export type PublicPosition = { name: string | null; type: string | null; location: string | null; count: number | null };

export type RecruitmentPageData = {
  summary: RecruitmentSummary & { event_id: string };
  details: RecruitmentPrivateDetails | null;
  isAdmin: boolean;
  isOwner: boolean;
  hasResume: boolean;
  interestCount: number;
  userIsInterested: boolean;
  applicants: Applicant[];
  publicPositions: PublicPosition[];
  eventName: { name: string; name_en: string | null } | null;
};

/**
 * /events/[slug]/recruitment/[id] for `viewer`. The old RLS rules: the
 * summary is public; private details need a signed-in viewer; applicants
 * (their private profiles) are for admins and this recruitment's owners.
 */
export async function getRecruitmentPageData(
  id: string,
  eventSlug: string,
  viewer: Viewer | null,
): Promise<RecruitmentPageData | null> {
  if (!isUuid(id)) return null;
  const [summary] = await db.select(summaryColumns).from(competitions).where(eq(competitions.id, id)).limit(1);
  if (!summary?.event_id) return null;

  const isAdmin = viewer?.role === "admin";
  const [details, ownProfile, isOwner, [{ n: interestCount }], positions, [eventName]] = await Promise.all([
    viewer
      ? db
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
          .where(eq(competition_private_details.competition_id, id))
          .limit(1)
          .then(([row]) => (row as RecruitmentPrivateDetails | undefined) ?? null)
      : Promise.resolve(null),
    viewer
      ? db
          .select({ resume: profiles.resume })
          .from(profiles)
          .where(eq(profiles.id, viewer.id))
          .limit(1)
          .then(([row]) => row ?? null)
      : Promise.resolve(null),
    viewer && !isAdmin ? isRecruitmentOwner(viewer.id, id) : Promise.resolve(false),
    db.select({ n: count() }).from(recruitment_interests).where(eq(recruitment_interests.competition_id, id)),
    // Name, type, location and count only, for the JobPosting JSON-LD.
    db.execute<PublicPosition>(sql`
      select p->>'name' as name, p->>'type' as type, p->>'location' as location, (p->>'count')::int as count
      from competition_private_details cpd, jsonb_array_elements(cpd.positions) p
      where cpd.competition_id = ${id} and jsonb_typeof(cpd.positions) = 'array'`),
    db
      .select({ name: events.name, name_en: events.name_en })
      .from(events)
      .where(and(eq(events.slug, eventSlug), isAdmin ? undefined : eq(events.status, "published")))
      .limit(1),
  ]);

  const canViewApplicants = isAdmin || isOwner;
  let userIsInterested = false;
  if (viewer && !canViewApplicants) {
    const [row] = await db
      .select({ id: recruitment_interests.id })
      .from(recruitment_interests)
      .where(and(eq(recruitment_interests.competition_id, id), eq(recruitment_interests.user_id, viewer.id)))
      .limit(1);
    userIsInterested = Boolean(row);
  }

  let applicants: Applicant[] = [];
  if (canViewApplicants) {
    const interested = await db
      .select({ user_id: recruitment_interests.user_id })
      .from(recruitment_interests)
      .where(eq(recruitment_interests.competition_id, id));
    if (interested.length) {
      applicants = await db
        .select({
          id: profiles.id,
          display_name: profiles.display_name,
          avatar_url: profiles.avatar_url,
          bio: profiles.bio,
          resume: profiles.resume,
        })
        .from(profiles)
        .where(
          inArray(
            profiles.id,
            interested.map((r) => r.user_id),
          ),
        );
    }
  }

  return {
    summary: summary as RecruitmentSummary & { event_id: string },
    details,
    isAdmin,
    isOwner,
    hasResume: Boolean(ownProfile?.resume),
    interestCount,
    userIsInterested,
    applicants,
    publicPositions: positions.rows,
    eventName: eventName ?? null,
  };
}
