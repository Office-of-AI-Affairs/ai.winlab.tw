#!/usr/bin/env bun
// Recompress Tiptap-embedded images living inside jsonb content columns.
//
// Walks announcements.content, results.content, introduction.content for
// every { type: "image", attrs: { src: ... } } node whose src points at our
// announcement-images bucket. For each unique src:
//   - skip already-webp / already-small files
//   - download, sharp → webp (max 1920px, q80)
//   - upload alongside under the same prefix with a new timestamped name
//   - rewrite every occurrence of the old src inside every affected row
//   - UPDATE the row, then delete the old object
//
// Dry-run by default. Pass --execute to actually change anything.

import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv() {
  for (const f of [".env.local", ".env"]) {
    try {
      for (const line of readFileSync(resolve(process.cwd(), f), "utf8").split("\n")) {
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
const SKIP_BYTES = 200_000;

if (!SUPABASE_URL || !SUPABASE_KEY || !AGENT_EMAIL || !AGENT_PASSWORD) {
  throw new Error("Missing env vars");
}

const execute = process.argv.includes("--execute");
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

const TABLES = [
  { table: "announcements", column: "content" as const, pk: "id" },
  { table: "results", column: "content" as const, pk: "id" },
  { table: "introduction", column: "content" as const, pk: "id" },
] as const;

type Row = { id: string; content: unknown };
type JsonNode = { type?: string; attrs?: Record<string, unknown>; content?: JsonNode[] } & Record<string, unknown>;

async function signIn() {
  const { error } = await sb.auth.signInWithPassword({ email: AGENT_EMAIL, password: AGENT_PASSWORD });
  if (error) throw new Error(`sign in: ${error.message}`);
  console.log(`✓ signed in as ${AGENT_EMAIL}`);
}

function walkImages(node: JsonNode, visit: (src: string) => string | null): boolean {
  let changed = false;
  if (node.type === "image" && node.attrs && typeof node.attrs.src === "string") {
    const next = visit(node.attrs.src);
    if (next && next !== node.attrs.src) {
      node.attrs.src = next;
      changed = true;
    }
  }
  if (Array.isArray(node.content)) {
    for (const child of node.content) {
      if (walkImages(child as JsonNode, visit)) changed = true;
    }
  }
  return changed;
}

function collectImageSrcs(node: JsonNode, bag: Set<string>): void {
  if (node.type === "image" && node.attrs && typeof node.attrs.src === "string") {
    if (node.attrs.src.includes("/announcement-images/")) bag.add(node.attrs.src);
  }
  if (Array.isArray(node.content)) {
    for (const child of node.content) collectImageSrcs(child as JsonNode, bag);
  }
}

function extractPath(url: string): string | null {
  const m = url.match(/\/announcement-images\/(.+?)(\?|$)/);
  return m ? m[1] : null;
}

async function compressOne(url: string): Promise<{ newUrl: string; oldPath: string; beforeBytes: number; afterBytes: number } | { skipped: string; oldPath?: string }> {
  const oldPath = extractPath(url);
  if (!oldPath) return { skipped: "unparseable url" };
  if (url.endsWith(".webp")) return { skipped: "already webp", oldPath };

  const res = await fetch(url);
  if (!res.ok) return { skipped: `fetch ${res.status}`, oldPath };
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < SKIP_BYTES) return { skipped: `${(buf.length / 1024).toFixed(0)} KB already small`, oldPath };

  const out = await sharp(buf, { failOn: "none" })
    .rotate()
    .resize({ width: 1920, height: 1920, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();

  const dir = oldPath.includes("/") ? oldPath.slice(0, oldPath.lastIndexOf("/") + 1) : "";
  const newName = `${Date.now()}-${Math.random().toString(36).slice(2)}.webp`;
  const newPath = `${dir}${newName}`;

  if (!execute) {
    return { newUrl: `(dry-run) ${newPath}`, oldPath, beforeBytes: buf.length, afterBytes: out.length };
  }

  const { error: upErr } = await sb.storage.from(BUCKET).upload(newPath, out, {
    contentType: "image/webp",
    cacheControl: "31536000",
    upsert: false,
  });
  if (upErr) throw new Error(`upload ${newPath}: ${upErr.message}`);

  const { data: { publicUrl } } = sb.storage.from(BUCKET).getPublicUrl(newPath);
  return { newUrl: publicUrl, oldPath, beforeBytes: buf.length, afterBytes: out.length };
}

async function main() {
  await signIn();
  console.log(execute ? "MODE: EXECUTE" : "MODE: DRY RUN");

  // Pass 1 — collect every unique image src across all rows.
  const allSrcs = new Set<string>();
  const rowsByTable: Record<string, Row[]> = {};
  for (const { table, column } of TABLES) {
    const { data, error } = await sb.from(table).select(`id, ${column}`);
    if (error) throw new Error(`select ${table}: ${error.message}`);
    const rows = (data as unknown as Row[]) ?? [];
    rowsByTable[table] = rows;
    for (const row of rows) {
      if (row.content) collectImageSrcs(row.content as JsonNode, allSrcs);
    }
  }
  console.log(`\nCollected ${allSrcs.size} unique image srcs across Tiptap content`);

  // Pass 2 — compress each unique src once.
  const map: Record<string, string> = {}; // old URL → new URL
  const oldPaths: string[] = [];
  let totalBefore = 0;
  let totalAfter = 0;
  let compressed = 0;
  let skipped = 0;

  for (const src of allSrcs) {
    try {
      const r = await compressOne(src);
      if ("newUrl" in r) {
        map[src] = r.newUrl;
        if (r.oldPath) oldPaths.push(r.oldPath);
        totalBefore += r.beforeBytes;
        totalAfter += r.afterBytes;
        compressed++;
        console.log(`  ${src.split("/").pop()?.slice(0, 40)}  ${(r.beforeBytes / 1024).toFixed(0)} KB → ${(r.afterBytes / 1024).toFixed(0)} KB`);
      } else {
        skipped++;
      }
    } catch (err) {
      console.log(`  FAILED  ${src.split("/").pop()?.slice(0, 40)}  ${err instanceof Error ? err.message : err}`);
    }
  }

  console.log(`\n${compressed} compressed, ${skipped} skipped`);
  if (compressed > 0) {
    console.log(`Storage: ${(totalBefore / 1024 / 1024).toFixed(2)} MB → ${(totalAfter / 1024 / 1024).toFixed(2)} MB`);
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const logPath = `/tmp/tiptap-recompress-${stamp}.json`;
  writeFileSync(logPath, JSON.stringify({ execute, map, oldPaths }, null, 2));
  console.log(`Log: ${logPath}`);

  if (Object.keys(map).length === 0) {
    console.log("Nothing to rewrite.");
    return;
  }

  // Pass 3 — rewrite jsonb content in every affected row.
  console.log("\nRewriting Tiptap jsonb references…");
  let rowsUpdated = 0;
  for (const { table, column, pk } of TABLES) {
    for (const row of rowsByTable[table] ?? []) {
      if (!row.content) continue;
      const clone = JSON.parse(JSON.stringify(row.content)) as JsonNode;
      const changed = walkImages(clone, (src) => map[src] ?? null);
      if (!changed) continue;
      if (!execute) { rowsUpdated++; continue; }
      const { error } = await sb.from(table).update({ [column]: clone }).eq(pk, row.id);
      if (error) {
        console.log(`  update ${table}/${row.id}: ${error.message}`);
        continue;
      }
      rowsUpdated++;
      console.log(`  ✓ ${table}/${row.id}`);
    }
  }
  console.log(`${rowsUpdated} rows ${execute ? "updated" : "would be updated"}`);

  // Pass 4 — delete old objects (only after successful rewrites).
  if (!execute || oldPaths.length === 0) return;
  console.log("\nDeleting old objects…");
  const BATCH = 50;
  let deleted = 0;
  for (let i = 0; i < oldPaths.length; i += BATCH) {
    const batch = oldPaths.slice(i, i + BATCH);
    const { data, error } = await sb.storage.from(BUCKET).remove(batch);
    if (error) {
      console.log(`  batch error: ${error.message}`);
      continue;
    }
    deleted += data?.length ?? 0;
  }
  console.log(`Deleted ${deleted}/${oldPaths.length} old objects.`);
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
