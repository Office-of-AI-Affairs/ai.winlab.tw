"use server";

import { and, desc, eq, inArray } from "drizzle-orm";
import { getViewer } from "@/lib/auth/viewer";
import { db } from "@/lib/db";
import { content_revisions, public_profiles } from "@/lib/db/schema";
import { isUuid } from "@/lib/slug";

export type Revision = { id: string; created_at: string; changed_by: string | null; snapshot: unknown };

/** The 20 latest revisions of a row, for admins and editors (RLS rule kept). */
export async function listRevisions(
  tableName: string,
  rowId: string,
): Promise<{ ok: true; revisions: Revision[]; actorNames: Record<string, string> } | { ok: false }> {
  const viewer = await getViewer();
  if (!viewer || (viewer.role !== "admin" && viewer.role !== "editor") || !isUuid(rowId)) return { ok: false };
  const revisions = await db
    .select({
      id: content_revisions.id,
      created_at: content_revisions.created_at,
      changed_by: content_revisions.changed_by,
      snapshot: content_revisions.snapshot,
    })
    .from(content_revisions)
    .where(and(eq(content_revisions.table_name, tableName), eq(content_revisions.row_id, rowId)))
    .orderBy(desc(content_revisions.created_at))
    .limit(20);
  const actorIds = [...new Set(revisions.map((r) => r.changed_by).filter((id): id is string => Boolean(id)))];
  const names = actorIds.length
    ? await db
        .select({ id: public_profiles.id, display_name: public_profiles.display_name })
        .from(public_profiles)
        .where(inArray(public_profiles.id, actorIds))
    : [];
  const actorNames: Record<string, string> = {};
  for (const p of names) if (p.display_name) actorNames[p.id] = p.display_name;
  return { ok: true, revisions, actorNames };
}
