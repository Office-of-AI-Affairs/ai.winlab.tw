"use server";

import { asc, desc, eq, sql, type SQL } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";
import { getViewer, type Viewer } from "@/lib/auth/viewer";
import { asUser, db, type Tx } from "@/lib/db";
import { isUuid } from "@/lib/slug";
import { isRowTable, ROW_POLICIES, writableValues, type RowPolicy, type RowTable } from "@/lib/permissions/rows";

// Generic reads and writes for the editors (useContentEditor, useCrudList,
// useDialogForm, useEventActions). Each call checks lib/permissions/rows.ts;
// a server action is a public endpoint, whatever page shows its button.

type Row = Record<string, unknown>;
export type RowResult<T = Row> = { ok: true; row: T } | { ok: false; error: string };
export type Done = { ok: true } | { ok: false; error: string };

const DENIED = { ok: false, error: "Forbidden" } as const;
const NOT_FOUND = { ok: false, error: "Not found" } as const;

function policyFor(table: unknown): RowPolicy | null {
  return isRowTable(table) ? ROW_POLICIES[table] : null;
}

// Typed loosely on purpose: the table is chosen at run time.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const idColumn = (policy: RowPolicy) => (policy.table as any).id as PgColumn;

async function loadRow(policy: RowPolicy, id: string): Promise<Row | null> {
  const [row] = await db.select().from(policy.table).where(eq(idColumn(policy), id)).limit(1);
  return (row as Row | undefined) ?? null;
}

/**
 * The row, locked until the transaction ends. Writes check the policy on
 * this copy, so nobody can change the row between the check and the write
 * (RLS checked inside the statement itself).
 */
async function lockRow(tx: Tx, policy: RowPolicy, id: string): Promise<Row | null> {
  const [row] = await tx.select().from(policy.table).where(eq(idColumn(policy), id)).limit(1).for("update");
  return (row as Row | undefined) ?? null;
}

/** Only admins may hand a row to someone else (author_id). */
const changesOwner = (viewer: Viewer, before: Row, clean: Row) =>
  viewer.role !== "admin" && "author_id" in clean && clean.author_id !== before.author_id;

/** One row the viewer may read, by id (or by slug for announcements and events). */
export async function getRow(table: RowTable, key: string): Promise<RowResult> {
  const policy = policyFor(table);
  if (!policy || typeof key !== "string") return NOT_FOUND;
  const viewer = await getViewer();
  let row: Row | null = null;
  if (isUuid(key)) row = await loadRow(policy, key);
  if (!row && (table === "announcements" || table === "events")) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const slug = (policy.table as any).slug as PgColumn;
    const [bySlug] = await db.select().from(policy.table).where(eq(slug, key)).limit(1);
    row = (bySlug as Row | undefined) ?? null;
  }
  if (!row || !(await policy.read(viewer, row))) return NOT_FOUND;
  return { ok: true, row };
}

/**
 * Rows of a table the viewer may read, filtered by equality on the given
 * columns (e.g. { event_id, status: "draft" }) and ordered.
 */
export async function listRows(
  table: RowTable,
  where: Record<string, string | boolean | null> = {},
  order: { column: string; ascending?: boolean }[] = [],
): Promise<Row[]> {
  const policy = policyFor(table);
  if (!policy) return [];
  const viewer = await getViewer();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const columns = policy.table as any as Record<string, PgColumn>;
  const filters: SQL[] = [];
  for (const [key, value] of Object.entries(where ?? {})) {
    const column = columns[key];
    if (!column) return [];
    filters.push(value === null ? sql`${column} is null` : eq(column, value));
  }
  const orderBy = (order ?? [])
    .filter((o) => columns[o.column])
    .map((o) => (o.ascending === false ? desc(columns[o.column]) : asc(columns[o.column])));
  const rows = (await db
    .select()
    .from(policy.table)
    .where(filters.length ? sql.join(filters, sql` and `) : undefined)
    .orderBy(...orderBy)) as Row[];
  const visible: Row[] = [];
  for (const row of rows) if (await policy.read(viewer, row)) visible.push(row);
  return visible;
}

export async function insertRow(table: RowTable, values: Row): Promise<RowResult> {
  const policy = policyFor(table);
  const viewer = await getViewer();
  if (!policy?.insert || !viewer) return DENIED;
  const clean = writableValues(policy, values ?? {});
  if (table === "competitions") clean.created_by = viewer.id;
  if (!(await policy.insert(viewer, clean))) return DENIED;
  const [row] = await asUser(viewer.id, (tx) => tx.insert(policy.table).values(clean).returning());
  return { ok: true, row: row as Row };
}

export async function updateRow(table: RowTable, id: string, patch: Row): Promise<RowResult> {
  const policy = policyFor(table);
  const viewer = await getViewer();
  if (!policy?.update || !viewer) return DENIED;
  if (!isUuid(id)) return NOT_FOUND;
  return asUser(viewer.id, async (tx): Promise<RowResult> => {
    const before = await lockRow(tx, policy, id);
    if (!before) return NOT_FOUND;
    const clean = writableValues(policy, patch ?? {});
    if (changesOwner(viewer, before, clean)) return DENIED;
    // Checked before and after the change, like RLS USING and WITH CHECK.
    if (!(await policy.update!(viewer, before)) || !(await policy.update!(viewer, { ...before, ...clean }))) {
      return DENIED;
    }
    if (Object.keys(clean).length === 0) return { ok: true, row: before };
    const [row] = await tx.update(policy.table).set(clean).where(eq(idColumn(policy), id)).returning();
    return { ok: true, row: row as Row };
  });
}

export async function deleteRow(table: RowTable, id: string): Promise<Done> {
  const policy = policyFor(table);
  const viewer = await getViewer();
  if (!policy?.delete || !viewer) return DENIED;
  if (!isUuid(id)) return NOT_FOUND;
  return asUser(viewer.id, async (tx): Promise<Done> => {
    const before = await lockRow(tx, policy, id);
    if (!before) return NOT_FOUND;
    if (!(await policy.delete!(viewer, before))) return DENIED;
    await tx.delete(policy.table).where(eq(idColumn(policy), id));
    return { ok: true };
  });
}

/** Sets sort_order to each id's position in `ids`. */
export async function reorderRows(table: RowTable, ids: string[]): Promise<Done> {
  const policy = policyFor(table);
  const viewer = await getViewer();
  if (!policy?.update || !viewer || !Array.isArray(ids) || !ids.every(isUuid)) return DENIED;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!(policy.table as any).sort_order) return DENIED;
  return asUser(viewer.id, async (tx): Promise<Done> => {
    // Lock in a fixed order, so two reorders at once cannot deadlock.
    for (const id of [...ids].sort()) {
      const before = await lockRow(tx, policy, id);
      if (!before || !(await policy.update!(viewer, before))) return DENIED;
    }
    for (const [index, id] of ids.entries()) {
      await tx.update(policy.table).set({ sort_order: index }).where(eq(idColumn(policy), id));
    }
    return { ok: true };
  });
}
