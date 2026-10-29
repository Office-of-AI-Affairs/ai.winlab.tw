import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import path from "node:path";
import { Pool, type PoolClient } from "pg";

/**
 * Applies drizzle/*.sql before the server takes requests (called from
 * instrumentation.ts). The SQL is hand-written and is the source of truth;
 * lib/db/schema.ts mirrors it. A new migration is a new numbered file plus
 * an entry in drizzle/meta/_journal.json whose "when" is larger than every
 * earlier one: the migrator skips anything older than the last it applied.
 * Carrel starts the app with a fixed command, so there is no separate
 * migrate step. An advisory lock keeps two processes from migrating at once
 * during a release switch.
 *
 * After a power cut the app can start before Postgres does. Next caches a
 * failed register() and answers every request with 500 without exiting, so
 * wait for the database here, and exit if it never comes so systemd
 * restarts the app.
 */
export async function migrateDatabase(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) return;
  const pool = new Pool({ connectionString: url, max: 1 });
  const client = await connectWithRetry(pool);
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

async function connectWithRetry(pool: Pool): Promise<PoolClient> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await pool.connect();
    } catch (error) {
      if (attempt >= 30) {
        console.error("database unreachable after 60 s, exiting", error);
        process.exit(1);
      }
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
}
