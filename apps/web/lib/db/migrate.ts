import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import path from "node:path";
import { Pool } from "pg";

/**
 * Applies drizzle/*.sql before the server takes requests (called from
 * instrumentation.ts). The SQL is hand-written and is the source of truth;
 * lib/db/schema.ts mirrors it. A new migration is a new numbered file plus
 * an entry in drizzle/meta/_journal.json whose "when" is larger than every
 * earlier one: the migrator skips anything older than the last it applied.
 * Carrel starts the app with a fixed command, so there is no separate
 * migrate step. An advisory lock keeps two processes from migrating at once
 * during a release switch.
 */
export async function migrateDatabase(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) return;
  const pool = new Pool({ connectionString: url, max: 1 });
  const client = await pool.connect();
  try {
    await client.query("select pg_advisory_lock(7240311)");
    await migrate(drizzle(client), {
      migrationsFolder: process.env.MIGRATIONS_DIR ?? path.join(process.cwd(), "drizzle"),
    });
  } finally {
    await client.query("select pg_advisory_unlock(7240311)").catch(() => {});
    client.release();
    await pool.end();
  }
}
