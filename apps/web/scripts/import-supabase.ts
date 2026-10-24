// Copies production data from Supabase into the app's own Postgres.
//
//   bun scripts/import-supabase.ts            dry run: counts only
//   bun scripts/import-supabase.ts --replace  empty the target, then import
//
// Env:
//   DATABASE_URL               target Postgres (migrated; superuser)
//   SUPABASE_ACCESS_TOKEN      Management API token (reads via SQL)
//   SUPABASE_PROJECT_REF       e.g. hwezfbhjcetpezfuvelf
//   SUPABASE_SERVICE_ROLE_KEY  downloads Storage objects
//
// Rows keep their ids. Users keep their bcrypt password hash. Image URLs
// pointing at Supabase Storage become /files/announcement-images/... .
// Triggers are off while loading, so audit_log, content_revisions and
// public_profiles arrive exactly as they were.
import { Pool } from "pg";

const ref = need("SUPABASE_PROJECT_REF");
const token = need("SUPABASE_ACCESS_TOKEN");
const serviceKey = need("SUPABASE_SERVICE_ROLE_KEY");
const replace = process.argv.includes("--replace");
const supabaseUrl = `https://${ref}.supabase.co`;

// Parents before children, so foreign keys hold row by row.
const TABLES = [
  "events",
  "tags",
  "profiles",
  "public_profiles",
  "announcements",
  "articles",
  "results",
  "result_tags",
  "result_coauthors",
  "external_results",
  "event_participants",
  "competitions",
  "competition_owners",
  "competition_private_details",
  "recruitment_interests",
  "carousel_slides",
  "contacts",
  "introduction",
  "organization_members",
  "privacy_policy",
  "content_revisions",
  "audit_log",
];

const PUBLIC_PREFIXES = [
  `${supabaseUrl}/storage/v1/object/public/announcement-images/`,
  "https://cdn.winlab.tw/announcement-images/",
];

function need(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

async function source<T>(query: string): Promise<T[]> {
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query/read-only`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(`source query failed (${res.status}): ${await res.text()}`);
  return res.json() as Promise<T[]>;
}

/** Every Supabase Storage URL in a JSON payload, rewritten to /files. */
function rewriteUrls(json: string): string {
  let out = json;
  for (const prefix of PUBLIC_PREFIXES) out = out.replaceAll(prefix, "/files/announcement-images/");
  return out;
}

const pool = new Pool({ connectionString: need("DATABASE_URL"), max: 2 });
const db = await pool.connect();

type SourceUser = {
  id: string;
  email: string;
  encrypted_password: string | null;
  email_confirmed_at: string | null;
  created_at: string;
  updated_at: string;
  name: string | null;
};
const users = await source<SourceUser>(`
  select u.id, u.email, u.encrypted_password, u.email_confirmed_at, u.created_at, u.updated_at,
         coalesce(nullif(btrim(p.display_name), ''), u.raw_user_meta_data->>'display_name') as name
  from auth.users u left join public.profiles p on p.id = u.id
  order by u.created_at`);
const counts = await source<{ t: string; n: number }>(
  TABLES.map((t) => `select '${t}' as t, count(*)::int as n from public.${t}`).join(" union all "),
);
const objects = await source<{ bucket_id: string; name: string; mimetype: string | null; owner: string | null }>(`
  select bucket_id, name, metadata->>'mimetype' as mimetype, owner_id::uuid as owner
  from storage.objects where bucket_id in ('announcement-images', 'resumes') order by bucket_id, name`);

console.log(`source: ${users.length} users, ${objects.length} files`);
for (const { t, n } of counts) console.log(`  ${t}: ${n}`);
if (!replace) {
  console.log("dry run; pass --replace to import");
  process.exit(0);
}

// Download first, 8 at a time, so the write transaction stays short.
type Downloaded = { bucket: string; path: string; contentType: string; owner: string | null; data: Buffer };
const downloaded: Downloaded[] = [];
for (let i = 0; i < objects.length; i += 8) {
  const batch = await Promise.all(
    objects.slice(i, i + 8).map(async (o) => {
      const res = await fetch(`${supabaseUrl}/storage/v1/object/authenticated/${o.bucket_id}/${o.name}`, {
        headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey },
      });
      if (!res.ok) throw new Error(`download ${o.bucket_id}/${o.name}: ${res.status}`);
      return {
        bucket: o.bucket_id,
        path: o.name,
        contentType: o.mimetype ?? res.headers.get("content-type") ?? "application/octet-stream",
        owner: o.owner,
        data: Buffer.from(await res.arrayBuffer()),
      };
    }),
  );
  downloaded.push(...batch);
}
console.log(`downloaded ${downloaded.length} files`);

await db.query("begin");
try {
  await db.query("set local session_replication_role = replica");
  await db.query(`truncate ${["files", ...TABLES].join(", ")}, users, sessions, accounts, verifications cascade`);

  for (const u of users) {
    await db.query(
      `insert into users (id, name, email, email_verified, created_at, updated_at) values ($1, $2, $3, $4, $5, $6)`,
      [u.id, u.name ?? "", u.email.toLowerCase(), u.email_confirmed_at !== null, u.created_at, u.updated_at],
    );
    if (u.encrypted_password) {
      await db.query(
        `insert into accounts (account_id, provider_id, user_id, password, created_at, updated_at)
         values ($1, 'credential', $2, $3, $4, $5)`,
        [u.id, u.id, u.encrypted_password, u.created_at, u.updated_at],
      );
    }
  }

  for (const table of TABLES) {
    const columns = (
      await db.query<{ column_name: string }>(
        `select column_name from information_schema.columns
         where table_schema = 'public' and table_name = $1 and is_generated = 'NEVER'
         order by ordinal_position`,
        [table],
      )
    ).rows.map((r) => `"${r.column_name}"`);
    const [{ rows }] = await source<{ rows: unknown[] | null }>(
      `select json_agg(t) as rows from public.${table} t`,
    );
    const json = rewriteUrls(JSON.stringify(rows ?? []));
    const list = columns.join(", ");
    await db.query(
      `insert into ${table} (${list}) select ${list} from json_populate_recordset(null::${table}, $1::json)`,
      [json],
    );
  }

  for (const f of downloaded) {
    await db.query(
      `insert into files (bucket, path, content_type, size, data, owner_id) values ($1, $2, $3, $4, $5,
         (select id from users where id = $6::uuid))`,
      [f.bucket, f.path, f.contentType, f.data.length, f.data, f.owner],
    );
  }

  // Compare every table with the source before committing.
  const bad: string[] = [];
  for (const { t, n } of counts) {
    const { rows } = await db.query<{ n: number }>(`select count(*)::int as n from ${t}`);
    if (rows[0].n !== n) bad.push(`${t}: ${rows[0].n} != ${n}`);
  }
  const fileCount = (await db.query<{ n: number }>("select count(*)::int as n from files")).rows[0].n;
  if (fileCount !== objects.length) bad.push(`files: ${fileCount} != ${objects.length}`);
  const userCount = (await db.query<{ n: number }>("select count(*)::int as n from users")).rows[0].n;
  if (userCount !== users.length) bad.push(`users: ${userCount} != ${users.length}`);
  const left = (
    await db.query<{ n: number }>(
      `select count(*)::int as n from (${TABLES.map((t) => `select 1 from ${t} x where x::text like '%supabase.co/storage%'`).join(" union all ")}) s`,
    )
  ).rows[0].n;
  if (left) bad.push(`${left} rows still point at Supabase Storage`);
  if (bad.length) throw new Error(`verification failed:\n  ${bad.join("\n  ")}`);

  await db.query("commit");
  console.log(`imported ${users.length} users, ${counts.reduce((s, c) => s + c.n, 0)} rows, ${objects.length} files`);
} catch (error) {
  await db.query("rollback");
  throw error;
} finally {
  db.release();
  await pool.end();
}
