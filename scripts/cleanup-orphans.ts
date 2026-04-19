#!/usr/bin/env bun
// One-off: delete announcement-images/* objects that no DB row references.
//
// Coverage: direct-column image URLs + Tiptap-embedded URLs inside jsonb
// content (announcements, results, introduction). resumes/* is never
// touched because it lives in a different bucket now.
//
// Default is DRY RUN. Use --execute to actually delete. A full candidate
// list is always written to /tmp/orphan-cleanup-<timestamp>.json.

import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv() {
  for (const f of [".env.local", ".env"]) {
    try {
      const content = readFileSync(resolve(process.cwd(), f), "utf8");
      for (const line of content.split("\n")) {
        const m = line.match(/^([A-Z_]+)=(.*)$/);
        if (m) process.env[m[1]] ??= m[2];
      }
    } catch {}
  }
}
loadEnv();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!;
const AGENT_EMAIL = process.env.CLAUDE_AGENT_EMAIL!;
const AGENT_PASSWORD = process.env.CLAUDE_AGENT_PASSWORD!;
const BUCKET = "announcement-images";
const BATCH_SIZE = 50;

if (!SUPABASE_URL || !SUPABASE_KEY || !AGENT_EMAIL || !AGENT_PASSWORD) {
  throw new Error("Missing env vars");
}

const execute = process.argv.includes("--execute");
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

async function signIn() {
  const { error } = await sb.auth.signInWithPassword({ email: AGENT_EMAIL, password: AGENT_PASSWORD });
  if (error) throw new Error(`sign in: ${error.message}`);
  const { data: { user } } = await sb.auth.getUser();
  console.log(`✓ signed in as ${user?.email}`);
}

type OrphanRow = { name: string; bytes: number; created_at: string };

async function listOrphans(): Promise<OrphanRow[]> {
  const referenced = new Set<string>();

  const directQueries = [
    { table: "carousel_slides", column: "image" },
    { table: "events", column: "cover_image" },
    { table: "competitions", column: "image" },
    { table: "results", column: "header_image" },
    { table: "organization_members", column: "image" },
    { table: "external_results", column: "image" },
  ] as const;
  for (const { table, column } of directQueries) {
    const { data, error } = await sb.from(table).select(`${column}`);
    if (error) throw new Error(`select ${table}: ${error.message}`);
    for (const row of ((data as unknown) as Record<string, unknown>[] ?? [])) {
      const url = row[column];
      if (typeof url !== "string") continue;
      const m = url.match(/\/announcement-images\/(.+?)(\?|$)/);
      if (m) referenced.add(m[1]);
    }
  }
  const directCount = referenced.size;

  const tiptapQueries = [
    { table: "announcements", column: "content" },
    { table: "results", column: "content" },
    { table: "introduction", column: "content" },
  ] as const;
  for (const { table, column } of tiptapQueries) {
    const { data, error } = await sb.from(table).select(`${column}`);
    if (error) throw new Error(`select ${table}: ${error.message}`);
    for (const row of ((data as unknown) as Record<string, unknown>[] ?? [])) {
      const content = row[column];
      if (!content) continue;
      const text = JSON.stringify(content);
      const re = /\/announcement-images\/([A-Za-z0-9_/.\-]+?)(?:["\\?])/g;
      for (;;) {
        const m = re.exec(text);
        if (!m) break;
        referenced.add(m[1]);
      }
    }
  }
  console.log(`  referenced paths: ${directCount} direct + ${referenced.size - directCount} tiptap = ${referenced.size} total`);

  const prefixes = ["", "carousel", "results", "recruitment", "organization", "events", "external-results"];
  const allObjects: { name: string; metadata: Record<string, unknown> | null; created_at: string }[] = [];
  for (const prefix of prefixes) {
    let offset = 0;
    for (;;) {
      const { data, error } = await sb.storage.from(BUCKET).list(prefix, { limit: 1000, offset });
      if (error) throw new Error(`list ${prefix}: ${error.message}`);
      if (!data || data.length === 0) break;
      for (const item of data) {
        if (item.id === null) continue;
        const full = prefix ? `${prefix}/${item.name}` : item.name;
        allObjects.push({ name: full, metadata: item.metadata, created_at: item.created_at });
      }
      if (data.length < 1000) break;
      offset += 1000;
    }
  }
  console.log(`  scanned ${allObjects.length} storage objects`);

  const orphans: OrphanRow[] = [];
  for (const obj of allObjects) {
    if (obj.name.startsWith("resumes/")) continue;
    if (referenced.has(obj.name)) continue;
    const size = Number((obj.metadata as { size?: number } | null)?.size ?? 0);
    orphans.push({ name: obj.name, bytes: size, created_at: obj.created_at });
  }
  return orphans;
}

async function deleteBatch(paths: string[]): Promise<number> {
  const { data, error } = await sb.storage.from(BUCKET).remove(paths);
  if (error) {
    console.log(`  batch error: ${error.message}`);
    return 0;
  }
  return data?.length ?? 0;
}

async function main() {
  await signIn();
  console.log(execute ? "MODE: EXECUTE (will delete)" : "MODE: DRY RUN (no changes)");

  const orphans = await listOrphans();
  orphans.sort((a, b) => b.bytes - a.bytes);

  const totalBytes = orphans.reduce((acc, o) => acc + o.bytes, 0);
  console.log(`\nFound ${orphans.length} orphans totalling ${(totalBytes / 1024 / 1024).toFixed(2)} MB\n`);

  if (orphans.length === 0) return;

  console.log("Largest 10:");
  for (const o of orphans.slice(0, 10)) {
    console.log(`  ${(o.bytes / 1024).toFixed(0).padStart(6)} KB  ${o.created_at.slice(0, 10)}  ${o.name}`);
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const logPath = `/tmp/orphan-cleanup-${stamp}.json`;
  writeFileSync(logPath, JSON.stringify({ execute, orphans }, null, 2));
  console.log(`\nFull list: ${logPath}`);

  if (!execute) {
    console.log("\n(dry run — re-run with --execute to actually delete)");
    return;
  }

  console.log("\nDeleting in batches…");
  let deleted = 0;
  for (let i = 0; i < orphans.length; i += BATCH_SIZE) {
    const batch = orphans.slice(i, i + BATCH_SIZE).map((o) => o.name);
    const n = await deleteBatch(batch);
    deleted += n;
    console.log(`  batch ${Math.floor(i / BATCH_SIZE) + 1}: ${n}/${batch.length} deleted`);
  }
  console.log(`\nTotal deleted: ${deleted}/${orphans.length}`);
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
