"use server";

import { and, asc, eq, ilike } from "drizzle-orm";
import { getViewer, type Viewer } from "@/lib/auth/viewer";
import { asUser, db } from "@/lib/db";
import { events, public_profiles, result_coauthors, results } from "@/lib/db/schema";
import { ROW_POLICIES } from "@/lib/permissions/rows";
import { isUuid } from "@/lib/slug";
import type { PublicProfile, Result } from "@winlab/db";

export type Done = { ok: true } | { ok: false; error: string };

type CoauthorProfile = Pick<PublicProfile, "id" | "created_at" | "updated_at" | "display_name">;

const coauthorColumns = {
  id: public_profiles.id,
  created_at: public_profiles.created_at,
  updated_at: public_profiles.updated_at,
  display_name: public_profiles.display_name,
};

async function loadResult(id: string): Promise<Result | null> {
  if (!isUuid(id)) return null;
  const [row] = await db.select().from(results).where(eq(results.id, id)).limit(1);
  return (row as Result | undefined) ?? null;
}

/** "Result author or admin can insert/delete coauthors". */
const mayEditCoauthors = (viewer: Viewer | null, result: Result) =>
  viewer !== null && (result.author_id === viewer.id || viewer.role === "admin");

export type ResultDraft = {
  result: Result;
  event: { name: string; name_en: string | null } | null;
  publisher: { id: string; display_name: string | null } | null;
  coauthors: CoauthorProfile[];
};

/**
 * A result the viewer may read but visitors cannot (a draft), with what its
 * page shows around it. Uses the results read rule; coauthor rows of a
 * readable result are readable too.
 */
export async function getResultDraft(id: string): Promise<ResultDraft | null> {
  const viewer = await getViewer();
  const result = await loadResult(id);
  if (!result || !(await ROW_POLICIES.results.read(viewer, result))) return null;
  // The result's own event, and only if the viewer may read it.
  const [[eventRow], [publisher], coauthors] = await Promise.all([
    result.event_id
      ? db.select().from(events).where(eq(events.id, result.event_id)).limit(1)
      : Promise.resolve([]),
    result.author_id
      ? db
          .select({ id: public_profiles.id, display_name: public_profiles.display_name })
          .from(public_profiles)
          .where(eq(public_profiles.id, result.author_id))
          .limit(1)
      : Promise.resolve([]),
    // Coauthor rows of a draft: its author and admins (RLS on result_coauthors).
    result.status === "published" || mayEditCoauthors(viewer, result)
      ? db
          .select(coauthorColumns)
          .from(result_coauthors)
          .innerJoin(public_profiles, eq(public_profiles.id, result_coauthors.user_id))
          .where(eq(result_coauthors.result_id, result.id))
      : Promise.resolve([]),
  ]);
  const event =
    eventRow && (await ROW_POLICIES.events.read(viewer, eventRow))
      ? { name: eventRow.name, name_en: eventRow.name_en }
      : null;
  return { result, event, publisher: publisher ?? null, coauthors };
}

/** Public profiles whose name contains `query`, for the coauthor picker. */
export async function searchProfiles(query: string): Promise<CoauthorProfile[]> {
  const q = typeof query === "string" ? query.trim().slice(0, 100) : "";
  if (!q) return [];
  // Escape LIKE wildcards so the query matches literally.
  const pattern = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  return db
    .select(coauthorColumns)
    .from(public_profiles)
    .where(ilike(public_profiles.display_name, pattern))
    .orderBy(asc(public_profiles.display_name))
    .limit(10);
}

export async function addCoauthor(resultId: string, userId: string): Promise<Done> {
  const viewer = await getViewer();
  const result = await loadResult(resultId);
  if (!result || !mayEditCoauthors(viewer, result)) return { ok: false, error: "Forbidden" };
  if (!isUuid(userId)) return { ok: false, error: "Invalid user" };
  await asUser(viewer!.id, (tx) =>
    tx.insert(result_coauthors).values({ result_id: resultId, user_id: userId }).onConflictDoNothing(),
  );
  return { ok: true };
}

export async function removeCoauthor(resultId: string, userId: string): Promise<Done> {
  const viewer = await getViewer();
  const result = await loadResult(resultId);
  if (!result || !mayEditCoauthors(viewer, result)) return { ok: false, error: "Forbidden" };
  if (!isUuid(userId)) return { ok: false, error: "Invalid user" };
  await asUser(viewer!.id, (tx) =>
    tx
      .delete(result_coauthors)
      .where(and(eq(result_coauthors.result_id, resultId), eq(result_coauthors.user_id, userId))),
  );
  return { ok: true };
}
