import "server-only";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@/lib/db/schema";

// One pool per server process. DATABASE_URL points at the Postgres on the
// same machine (infra/postgres/compose.yaml); nothing else talks to it.
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 10 });

export const db = drizzle(pool, { schema, casing: "snake_case" });
export type Db = typeof db;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

/**
 * Runs `fn` in a transaction that knows who is acting. The audit_log and
 * content_revisions triggers read it through app_user_id(), the way they
 * read auth.uid() under Supabase. Use it for every write a person makes.
 */
export function asUser<T>(userId: string | null, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    if (userId) await tx.execute(sql`select set_config('app.user_id', ${userId}, true)`);
    return fn(tx);
  });
}
