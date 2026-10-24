import "server-only";
import { and, eq, getTableColumns } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import type { Viewer } from "@/lib/auth/viewer";
import { db } from "@/lib/db";
import {
  announcements,
  articles,
  carousel_slides,
  competition_owners,
  competitions,
  contacts,
  events,
  introduction,
  organization_members,
  results,
  tags,
} from "@/lib/db/schema";

// Who may read and write which rows. These rules are the Supabase RLS
// policies as they stood in production on 2026-10-24, one function per
// policy; RLS is gone, so this file is the only gate for the generic row
// actions in lib/actions/rows.ts.
//
// An update is checked against the row before (USING) and after
// (WITH CHECK) the change, as Postgres did.

type Row = Record<string, unknown>;
type Check = (viewer: Viewer, row: Row) => boolean | Promise<boolean>;
type ReadCheck = (viewer: Viewer | null, row: Row) => boolean | Promise<boolean>;

export type RowPolicy = {
  table: PgTable;
  /** Columns a caller may never set, on top of id, created_at, updated_at. */
  readOnly?: readonly string[];
  read: ReadCheck;
  insert?: Check;
  update?: Check;
  delete?: Check;
};

const isAdmin = (v: Viewer | null) => v?.role === "admin";
const isEditor = (v: Viewer | null) => v?.role === "editor";
const isMember = (v: Viewer | null) => v?.role === "member";

const adminOnly: Check = (v) => isAdmin(v);
const everyone: ReadCheck = () => true;

const isLiveAnnouncement = (row: Row) =>
  row.status === "published" &&
  (row.publish_at == null || new Date(row.publish_at as string).getTime() <= Date.now());

/** "Admin or editor can insert/update announcement": editors touch drafts only. */
const announcementWrite: Check = (v, row) => isAdmin(v) || (isEditor(v) && row.status === "draft");

/** "Author, admin, or editor can insert/update result". */
const resultWrite: Check = (v, row) =>
  row.author_id === v.id || isAdmin(v) || (isEditor(v) && row.status === "draft");

/** "Admin or author member can insert/update/delete article". */
const articleWrite: Check = (v, row) => isAdmin(v) || (row.author_id === v.id && isMember(v));

async function ownsCompetition(userId: string, competitionId: unknown): Promise<boolean> {
  if (typeof competitionId !== "string") return false;
  const [owner] = await db
    .select({ user_id: competition_owners.user_id })
    .from(competition_owners)
    .where(and(eq(competition_owners.competition_id, competitionId), eq(competition_owners.user_id, userId)))
    .limit(1);
  return Boolean(owner);
}

/** "Admin or owner can update/delete competition". */
const competitionWrite: Check = async (v, row) => isAdmin(v) || ownsCompetition(v.id, row.id);

export const ROW_POLICIES = {
  announcements: {
    table: announcements,
    read: (v, row) => isLiveAnnouncement(row) || isAdmin(v) || isEditor(v),
    insert: announcementWrite,
    update: announcementWrite,
    delete: adminOnly,
  },
  results: {
    table: results,
    read: (v, row) =>
      row.status === "published" || (v !== null && (row.author_id === v.id || isAdmin(v) || isEditor(v))),
    insert: resultWrite,
    update: resultWrite,
    delete: (v, row) => row.author_id === v.id || isAdmin(v),
  },
  events: {
    table: events,
    read: (v, row) => row.status === "published" || isAdmin(v),
    insert: adminOnly,
    update: adminOnly,
    delete: adminOnly,
  },
  articles: {
    table: articles,
    read: (v, row) => row.status === "published" || (v !== null && (row.author_id === v.id || isAdmin(v))),
    insert: articleWrite,
    update: articleWrite,
    delete: articleWrite,
  },
  carousel_slides: {
    table: carousel_slides,
    read: everyone,
    insert: adminOnly,
    update: adminOnly,
    delete: adminOnly,
  },
  contacts: {
    table: contacts,
    read: everyone,
    insert: adminOnly,
    update: adminOnly,
    delete: adminOnly,
  },
  introduction: {
    table: introduction,
    read: everyone,
    insert: adminOnly,
    update: adminOnly,
    // No delete policy: nobody deletes the introduction.
  },
  organization_members: {
    table: organization_members,
    read: everyone,
    insert: adminOnly,
    update: adminOnly,
    delete: adminOnly,
  },
  competitions: {
    table: competitions,
    // Set by the server to the creator; the owner trigger reads it.
    readOnly: ["created_by"],
    read: everyone,
    insert: adminOnly,
    update: competitionWrite,
    delete: competitionWrite,
  },
  tags: {
    table: tags,
    read: everyone,
    insert: adminOnly,
    update: adminOnly,
    delete: adminOnly,
  },
} satisfies Record<string, RowPolicy>;

export type RowTable = keyof typeof ROW_POLICIES;

const ALWAYS_READ_ONLY = ["id", "created_at", "updated_at"];

/** Keeps only the columns of `values` that a caller may set on `table`. */
export function writableValues(policy: RowPolicy, values: Row): Row {
  const columns = getTableColumns(policy.table);
  const blocked = new Set([...ALWAYS_READ_ONLY, ...(policy.readOnly ?? [])]);
  return Object.fromEntries(
    Object.entries(values).filter(([key]) => Object.hasOwn(columns, key) && !blocked.has(key)),
  );
}

export const isRowTable = (value: unknown): value is RowTable =>
  typeof value === "string" && Object.hasOwn(ROW_POLICIES, value);
