"use server";

import { and, desc, eq, inArray } from "drizzle-orm";
import { actor, getViewer } from "@/lib/auth/viewer";
import { asUser, db } from "@/lib/db";
import {
  competition_owners,
  competition_private_details,
  competitions,
  events,
  profiles,
  recruitment_interests,
  user as users,
} from "@/lib/db/schema";
import { isRecruitmentOwner } from "@/lib/data/recruitment";
import { isUuid } from "@/lib/slug";
import type { Json } from "@winlab/db";

export type Done = { ok: true; id?: string } | { ok: false; error: string };

const FORBIDDEN = { ok: false, error: "Forbidden" } as const;

/** Register or withdraw your own interest ("user can insert/delete own interest"). */
export async function setRecruitmentInterest(competitionId: string, interested: boolean): Promise<Done> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, error: "Sign in first" };
  if (!isUuid(competitionId)) return { ok: false, error: "Not found" };
  await asUser(viewer.id, (tx) =>
    interested
      ? tx.insert(recruitment_interests).values({ competition_id: competitionId, user_id: viewer.id }).onConflictDoNothing()
      : tx
          .delete(recruitment_interests)
          .where(and(eq(recruitment_interests.competition_id, competitionId), eq(recruitment_interests.user_id, viewer.id))),
  );
  return { ok: true };
}

type PublicFields = {
  title?: unknown;
  link?: unknown;
  image?: unknown;
  company_description?: unknown;
  start_date?: unknown;
  end_date?: unknown;
};
type PrivateFields = {
  positions?: unknown;
  application_method?: unknown;
  contact?: unknown;
  required_documents?: unknown;
};

const text = (v: unknown, max = 5000) => (typeof v === "string" ? v.slice(0, max) : null);
const json = (v: unknown): Json | null => (v !== null && typeof v === "object" ? (v as Json) : null);

function publicValues(input: PublicFields) {
  return {
    title: text(input.title, 300) ?? "",
    link: text(input.link, 2000) ?? "",
    image: text(input.image, 2000),
    company_description: text(input.company_description),
    start_date: text(input.start_date, 10) ?? new Date().toISOString().slice(0, 10),
    end_date: text(input.end_date, 10),
  };
}

function privateValues(input: PrivateFields | null) {
  if (!input) return null;
  if (input.positions != null && !Array.isArray(input.positions)) throw new Error("positions must be a list");
  const values = {
    positions: Array.isArray(input.positions) && input.positions.length ? (input.positions as Json) : null,
    application_method: json(input.application_method),
    contact: json(input.contact),
    required_documents: text(input.required_documents),
  };
  return Object.values(values).some((v) => v !== null) ? values : null;
}

/**
 * Creates (admins) or updates (admins and this recruitment's owners) a
 * recruitment with its private details, in one transaction. The
 * auto_add_recruitment_owner trigger makes the creator an owner.
 */
export async function saveRecruitment(input: {
  id: string | null;
  eventId: string | null;
  public: PublicFields;
  private: PrivateFields | null;
}): Promise<Done> {
  const viewer = await getViewer();
  if (!viewer || !input || typeof input !== "object") return FORBIDDEN;
  const isAdmin = viewer.role === "admin";
  const pub = publicValues(input.public ?? {});
  let priv: ReturnType<typeof privateValues>;
  try {
    priv = privateValues(input.private);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Invalid details" };
  }

  if (input.id) {
    if (!isUuid(input.id)) return { ok: false, error: "Not found" };
    if (!isAdmin && !(await isRecruitmentOwner(viewer.id, input.id))) return FORBIDDEN;
    await asUser(viewer.id, async (tx) => {
      await tx.update(competitions).set(pub).where(eq(competitions.id, input.id!));
      if (priv) {
        await tx
          .insert(competition_private_details)
          .values({ competition_id: input.id!, ...priv })
          .onConflictDoUpdate({ target: competition_private_details.competition_id, set: priv });
      } else {
        await tx.delete(competition_private_details).where(eq(competition_private_details.competition_id, input.id!));
      }
    });
    return { ok: true, id: input.id };
  }

  if (!isAdmin) return FORBIDDEN;
  if (!isUuid(input.eventId)) return { ok: false, error: "Invalid event" };
  const eventId = input.eventId;
  const id = await asUser(viewer.id, async (tx) => {
    const [row] = await tx
      .insert(competitions)
      .values({ ...pub, event_id: eventId, created_by: viewer.id })
      .returning({ id: competitions.id });
    if (priv) await tx.insert(competition_private_details).values({ competition_id: row.id, ...priv });
    return row.id;
  });
  return { ok: true, id };
}

export type OwnerRow = { user_id: string; email: string; display_name: string | null };
export type UserOption = { id: string; email: string; display_name: string | null };

/** Owners of a recruitment, with emails. Admins only. */
export async function listRecruitmentOwners(competitionId: string): Promise<OwnerRow[]> {
  await actor("admin");
  if (!isUuid(competitionId)) return [];
  return db
    .select({ user_id: competition_owners.user_id, email: users.email, display_name: profiles.display_name })
    .from(competition_owners)
    .innerJoin(users, eq(users.id, competition_owners.user_id))
    .leftJoin(profiles, eq(profiles.id, competition_owners.user_id))
    .where(eq(competition_owners.competition_id, competitionId));
}

/** Everyone who could become an owner. Admins only. */
export async function listOwnerCandidates(): Promise<UserOption[]> {
  await actor("admin");
  return db
    .select({ id: users.id, email: users.email, display_name: profiles.display_name })
    .from(users)
    .leftJoin(profiles, eq(profiles.id, users.id))
    .orderBy(desc(users.createdAt));
}

export async function addRecruitmentOwner(competitionId: string, userId: string): Promise<Done> {
  const viewer = await actor("admin");
  if (!isUuid(competitionId) || !isUuid(userId)) return { ok: false, error: "Invalid id" };
  await asUser(viewer.id, (tx) =>
    tx
      .insert(competition_owners)
      .values({ competition_id: competitionId, user_id: userId, added_by: viewer.id })
      .onConflictDoNothing(),
  );
  return { ok: true };
}

export async function removeRecruitmentOwner(competitionId: string, userId: string): Promise<Done> {
  const viewer = await actor("admin");
  if (!isUuid(competitionId) || !isUuid(userId)) return { ok: false, error: "Invalid id" };
  await asUser(viewer.id, (tx) =>
    tx
      .delete(competition_owners)
      .where(and(eq(competition_owners.competition_id, competitionId), eq(competition_owners.user_id, userId))),
  );
  return { ok: true };
}

export type OwnedRecruitment = { id: string; title: string; image: string | null; event_slug: string; event_name: string };

/** Recruitments you own, in events you can see. */
export async function listMyRecruitments(): Promise<OwnedRecruitment[]> {
  const viewer = await getViewer();
  if (!viewer) return [];
  const owned = await db
    .select({ id: competition_owners.competition_id })
    .from(competition_owners)
    .where(eq(competition_owners.user_id, viewer.id));
  if (!owned.length) return [];
  const rows = await db
    .select({
      id: competitions.id,
      title: competitions.title,
      image: competitions.image,
      event_slug: events.slug,
      event_name: events.name,
    })
    .from(competitions)
    .innerJoin(events, eq(events.id, competitions.event_id))
    .where(
      and(
        inArray(
          competitions.id,
          owned.map((o) => o.id),
        ),
        viewer.role === "admin" ? undefined : eq(events.status, "published"),
      ),
    );
  return rows;
}

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
};

const detailColumns = {
  competition_id: competition_private_details.competition_id,
  created_at: competition_private_details.created_at,
  updated_at: competition_private_details.updated_at,
  positions: competition_private_details.positions,
  application_method: competition_private_details.application_method,
  contact: competition_private_details.contact,
  required_documents: competition_private_details.required_documents,
};

/** A recruitment with its private details when the viewer is signed in (RLS rule). */
export async function getRecruitmentRecord(id: string) {
  const viewer = await getViewer();
  if (!isUuid(id)) return null;
  const [summary] = await db.select(summaryColumns).from(competitions).where(eq(competitions.id, id)).limit(1);
  if (!summary) return null;
  const [details] = viewer
    ? await db.select(detailColumns).from(competition_private_details).where(eq(competition_private_details.competition_id, id)).limit(1)
    : [];
  return { summary, details: details ?? null };
}

/**
 * Changes only the given fields (MCP update_recruitment). Admins and this
 * recruitment's owners; only admins may move it to another event.
 */
export async function patchRecruitment(
  id: string,
  publicPatch: Record<string, unknown>,
  privatePatch: Record<string, unknown>,
): Promise<Done> {
  const viewer = await getViewer();
  if (!viewer || !isUuid(id)) return FORBIDDEN;
  const isAdmin = viewer.role === "admin";
  if (!isAdmin && !(await isRecruitmentOwner(viewer.id, id))) return FORBIDDEN;
  if ("event_id" in publicPatch && !isAdmin) return FORBIDDEN;
  const allowedPublic = ["title", "link", "image", "company_description", "start_date", "end_date", "event_id"];
  const allowedPrivate = ["positions", "application_method", "contact", "required_documents"];
  const pub = Object.fromEntries(Object.entries(publicPatch).filter(([k]) => allowedPublic.includes(k)));
  const priv = Object.fromEntries(Object.entries(privatePatch).filter(([k]) => allowedPrivate.includes(k)));
  await asUser(viewer.id, async (tx) => {
    if (Object.keys(pub).length) await tx.update(competitions).set(pub).where(eq(competitions.id, id));
    if (Object.keys(priv).length) {
      await tx
        .insert(competition_private_details)
        .values({ competition_id: id, ...priv })
        .onConflictDoUpdate({ target: competition_private_details.competition_id, set: priv });
    }
  });
  return { ok: true, id };
}
