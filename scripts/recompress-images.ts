#!/usr/bin/env bun
/**
 * One-off: recompress existing announcement-images/* to WebP.
 *
 * Scope: only direct-column image URLs (carousel_slides.image,
 * events.cover_image, competitions.image, organization_members.image,
 * external_results.image, results.header_image). Tiptap-embedded images
 * in jsonb content fields are NOT touched — that's a separate pass.
 *
 * Flow for each row:
 *   1. Skip if URL already ends in .webp or file is small (<200 KB).
 *   2. Download original via public URL.
 *   3. Recompress to WebP (max 1920px, q80) via sharp.
 *   4. Upload new object alongside the old one (new timestamped name).
 *   5. Update the DB column to the new public URL.
 *   6. Delete the old object (admin DELETE policy required).
 *
 * Run: bun scripts/recompress-images.ts [--dry-run] [--only <table>]
 */

import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Load .env.local manually (Bun doesn't auto-load it outside Next.js)
function loadEnv() {
  try {
    const envContent = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of envContent.split("\n")) {
      const m = line.match(/^([A-Z_]+)=(.*)$/);
      if (m) process.env[m[1]] ??= m[2];
    }
  } catch {}
  try {
    const envContent = readFileSync(resolve(process.cwd(), ".env"), "utf8");
    for (const line of envContent.split("\n")) {
      const m = line.match(/^([A-Z_]+)=(.*)$/);
      if (m) process.env[m[1]] ??= m[2];
    }
  } catch {}
}
loadEnv();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!;
const AGENT_EMAIL = process.env.CLAUDE_AGENT_EMAIL!;
const AGENT_PASSWORD = process.env.CLAUDE_AGENT_PASSWORD!;
const BUCKET = "announcement-images";
const SKIP_BYTES_THRESHOLD = 200_000; // skip files already under this size

if (!SUPABASE_URL || !SUPABASE_KEY || !AGENT_EMAIL || !AGENT_PASSWORD) {
  throw new Error("Missing env vars (SUPABASE + CLAUDE_AGENT_*)");
}

const dryRun = process.argv.includes("--dry-run");
const onlyIdx = process.argv.indexOf("--only");
const onlyTable = onlyIdx > -1 ? process.argv[onlyIdx + 1] : null;

type Target = {
  table: "carousel_slides" | "events" | "competitions" | "results" | "organization_members" | "external_results";
  column: string;
  id: string;
  url: string;
};

const TARGETS: { table: Target["table"]; column: string }[] = [
  { table: "carousel_slides", column: "image" },
  { table: "events", column: "cover_image" },
  { table: "competitions", column: "image" },
  { table: "results", column: "header_image" },
  { table: "organization_members", column: "image" },
  { table: "external_results", column: "image" },
];

const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

async function signInAgent() {
  const { error } = await sb.auth.signInWithPassword({ email: AGENT_EMAIL, password: AGENT_PASSWORD });
  if (error) throw new Error(`agent sign in failed: ${error.message}`);
  const { data: { user } } = await sb.auth.getUser();
  console.log(`✓ signed in as ${user?.email} (id ${user?.id})`);
}

function extractObjectPath(url: string): string | null {
  const m = url.match(/\/announcement-images\/(.+?)(\?.*)?$/);
  return m ? m[1] : null;
}

async function loadTargets(): Promise<Target[]> {
  const all: Target[] = [];
  for (const { table, column } of TARGETS) {
    if (onlyTable && onlyTable !== table) continue;
    const { data, error } = await sb.from(table).select(`id, ${column}`);
    if (error) throw new Error(`select ${table}.${column}: ${error.message}`);
    for (const row of data ?? []) {
      const url = (row as Record<string, unknown>)[column];
      if (typeof url !== "string" || !url) continue;
      if (!url.includes("/announcement-images/")) continue;
      if (url.endsWith(".webp")) continue;
      all.push({ table, column, id: (row as { id: string }).id, url });
    }
  }
  return all;
}

async function processOne(t: Target): Promise<{
  status: "ok" | "skipped_small" | "skipped_missing" | "error";
  oldPath?: string;
  newUrl?: string;
  beforeBytes?: number;
  afterBytes?: number;
  error?: string;
}> {
  const objectPath = extractObjectPath(t.url);
  if (!objectPath) return { status: "error", error: "cannot parse object path" };

  try {
    const res = await fetch(t.url);
    if (!res.ok) return { status: "skipped_missing", error: `fetch ${res.status}` };
    const buf = Buffer.from(await res.arrayBuffer());
    const beforeBytes = buf.length;

    if (beforeBytes < SKIP_BYTES_THRESHOLD) {
      return { status: "skipped_small", beforeBytes };
    }

    // Recompress to WebP.
    const out = await sharp(buf, { failOn: "none" })
      .rotate()
      .resize({ width: 1920, height: 1920, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    // Keep the original prefix directory to preserve organization.
    const dir = objectPath.includes("/") ? objectPath.slice(0, objectPath.lastIndexOf("/") + 1) : "";
    const newName = `${Date.now()}-${Math.random().toString(36).slice(2)}.webp`;
    const newPath = `${dir}${newName}`;

    if (dryRun) {
      return { status: "ok", oldPath: objectPath, newUrl: `(dry-run) ${newPath}`, beforeBytes, afterBytes: out.length };
    }

    const { error: upErr } = await sb.storage.from(BUCKET).upload(newPath, out, {
      contentType: "image/webp",
      cacheControl: "31536000",
      upsert: false,
    });
    if (upErr) return { status: "error", error: `upload: ${upErr.message}` };

    const { data: { publicUrl } } = sb.storage.from(BUCKET).getPublicUrl(newPath);

    const { error: dbErr } = await sb.from(t.table).update({ [t.column]: publicUrl }).eq("id", t.id);
    if (dbErr) return { status: "error", error: `db update: ${dbErr.message}` };

    const { error: delErr } = await sb.storage.from(BUCKET).remove([objectPath]);
    if (delErr) {
      return { status: "ok", oldPath: objectPath, newUrl: publicUrl, beforeBytes, afterBytes: out.length, error: `(non-fatal) delete old failed: ${delErr.message}` };
    }

    return { status: "ok", oldPath: objectPath, newUrl: publicUrl, beforeBytes, afterBytes: out.length };
  } catch (err) {
    return { status: "error", error: err instanceof Error ? err.message : String(err) };
  }
}

async function main() {
  await signInAgent();
  const targets = await loadTargets();
  console.log(`Found ${targets.length} candidates${dryRun ? " (DRY RUN)" : ""}`);

  let totalBefore = 0;
  let totalAfter = 0;
  let compressed = 0;
  let skipped = 0;
  let failed = 0;

  for (const t of targets) {
    process.stdout.write(`  ${t.table}/${t.id}  ${t.url.split("/").pop()?.slice(0, 40)}  ... `);
    const r = await processOne(t);
    if (r.status === "ok" && r.beforeBytes && r.afterBytes) {
      compressed++;
      totalBefore += r.beforeBytes;
      totalAfter += r.afterBytes;
      const pct = Math.round((1 - r.afterBytes / r.beforeBytes) * 100);
      console.log(`${(r.beforeBytes / 1024).toFixed(0)} KB → ${(r.afterBytes / 1024).toFixed(0)} KB (-${pct}%)${r.error ? ` warn:${r.error}` : ""}`);
    } else if (r.status === "skipped_small") {
      skipped++;
      console.log(`skipped (${(r.beforeBytes! / 1024).toFixed(0)} KB, already small)`);
    } else if (r.status === "skipped_missing") {
      skipped++;
      console.log(`skipped (${r.error})`);
    } else {
      failed++;
      console.log(`FAILED: ${r.error}`);
    }
  }

  console.log("");
  console.log(`Summary: ${compressed} compressed, ${skipped} skipped, ${failed} failed`);
  if (compressed > 0) {
    const pct = Math.round((1 - totalAfter / totalBefore) * 100);
    console.log(`Storage: ${(totalBefore / 1024 / 1024).toFixed(2)} MB → ${(totalAfter / 1024 / 1024).toFixed(2)} MB (-${pct}%)`);
  }
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
