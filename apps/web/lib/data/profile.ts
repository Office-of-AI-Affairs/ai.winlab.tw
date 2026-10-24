import "server-only";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import type { Viewer } from "@/lib/auth/viewer";
import { db } from "@/lib/db";
import { event_participants, events, external_results, profiles, public_profiles, result_coauthors, results } from "@/lib/db/schema";
import { mayReadPrivateProfile, ROW_POLICIES } from "@/lib/permissions/rows";
import { isUuid } from "@/lib/slug";
import { composeProfile } from "@winlab/domain";
import type { ExternalResult, Profile, PublicProfile, Result } from "@winlab/db";

export type ProfilePageData = {
  profile: Profile;
  results: Result[];
  externalResults: ExternalResult[];
  isOwner: boolean;
  canViewPrivateProfile: boolean;
  eventSlugMap: Record<string, string>;
  eventNameMap: Record<string, string>;
  participatedEvents: { id: string; name: string; slug: string }[];
};

/**
 * Everything /profile/[id] shows, as `viewer` may see it. The rules are the
 * old RLS ones: public_profiles for everyone, the private profiles row for
 * self / admin / recruitment owner of an applicant, results by the results
 * read rule, events by the events read rule (drafts for admins only).
 */
export async function getProfilePageData(id: string, viewer: Viewer | null): Promise<ProfilePageData | null> {
  if (!isUuid(id)) return null;
  const isOwner = viewer?.id === id;
  const isAdmin = viewer?.role === "admin";
  const canViewPrivateProfile = Boolean(viewer);

  const [[publicRow], privateRow, authored, external, coauthorRows, participantRows] = await Promise.all([
    // `resume` only for signed-in viewers: anonymous visitors must not learn
    // members' résumé paths.
    db
      .select({
        id: public_profiles.id,
        created_at: public_profiles.created_at,
        updated_at: public_profiles.updated_at,
        display_name: public_profiles.display_name,
        avatar_url: public_profiles.avatar_url,
        bio: public_profiles.bio,
        linkedin: public_profiles.linkedin,
        facebook: public_profiles.facebook,
        github: public_profiles.github,
        website: public_profiles.website,
        social_links: public_profiles.social_links,
        role: public_profiles.role,
        resume: public_profiles.resume,
      })
      .from(public_profiles)
      .where(eq(public_profiles.id, id))
      .limit(1),
    (async () => {
      if (!(await mayReadPrivateProfile(viewer, id))) return null;
      const [row] = await db
        .select({
          id: profiles.id,
          created_at: profiles.created_at,
          updated_at: profiles.updated_at,
          display_name: profiles.display_name,
          avatar_url: profiles.avatar_url,
          role: profiles.role,
          bio: profiles.bio,
          phone: profiles.phone,
          linkedin: profiles.linkedin,
          facebook: profiles.facebook,
          github: profiles.github,
          website: profiles.website,
          resume: profiles.resume,
          social_links: profiles.social_links,
        })
        .from(profiles)
        .where(eq(profiles.id, id))
        .limit(1);
      return row ?? null;
    })(),
    db.select().from(results).where(eq(results.author_id, id)).orderBy(desc(results.date)),
    db.select().from(external_results).where(eq(external_results.user_id, id)).orderBy(desc(external_results.created_at)),
    db.select({ result_id: result_coauthors.result_id }).from(result_coauthors).where(eq(result_coauthors.user_id, id)),
    isOwner
      ? db.select({ event_id: event_participants.event_id }).from(event_participants).where(eq(event_participants.user_id, id))
      : Promise.resolve([]),
  ]);
  if (!publicRow) return null;

  const coauthored = coauthorRows.length
    ? await db
        .select()
        .from(results)
        .where(inArray(results.id, coauthorRows.map((r) => r.result_id)))
        .orderBy(desc(results.date))
    : [];
  const authoredIds = new Set(authored.map((r) => r.id));
  const readable: Result[] = [];
  for (const r of [...authored, ...coauthored.filter((c) => !authoredIds.has(c.id))]) {
    if (await ROW_POLICIES.results.read(viewer, r)) readable.push(r as Result);
  }
  const visibleResults = isOwner ? readable : readable.filter((r) => r.status === "published");

  const participantEventIds = participantRows.map((p) => p.event_id);
  const eventIds = [
    ...new Set([...readable.map((r) => r.event_id).filter((e): e is string => Boolean(e)), ...participantEventIds]),
  ];
  const eventSlugMap: Record<string, string> = {};
  const eventNameMap: Record<string, string> = {};
  if (eventIds.length) {
    const rows = await db
      .select({ id: events.id, name: events.name, slug: events.slug })
      .from(events)
      .where(and(inArray(events.id, eventIds), isAdmin ? undefined : eq(events.status, "published")));
    for (const e of rows) {
      eventSlugMap[e.id] = e.slug;
      eventNameMap[e.id] = e.name;
    }
  }

  let participatedEvents: { id: string; name: string; slug: string }[] = [];
  if (isOwner) {
    if (isAdmin) {
      const all = await db
        .select({ id: events.id, name: events.name, slug: events.slug })
        .from(events)
        .where(eq(events.status, "published"))
        .orderBy(asc(events.sort_order));
      participatedEvents = all;
      for (const e of all) {
        eventSlugMap[e.id] = e.slug;
        eventNameMap[e.id] = e.name;
      }
    } else {
      participatedEvents = Object.entries(eventNameMap)
        .filter(([eventId]) => participantEventIds.includes(eventId))
        .map(([eventId, name]) => ({ id: eventId, name, slug: eventSlugMap[eventId] }));
    }
  }

  const { resume, ...publicFields } = publicRow;
  const publicProfile = { ...publicFields, resume: canViewPrivateProfile ? resume : null } as PublicProfile;
  return {
    profile: composeProfile(publicProfile, privateRow as Partial<Profile> | null),
    results: visibleResults,
    externalResults: external as ExternalResult[],
    isOwner,
    canViewPrivateProfile,
    eventSlugMap,
    eventNameMap,
    participatedEvents,
  };
}
