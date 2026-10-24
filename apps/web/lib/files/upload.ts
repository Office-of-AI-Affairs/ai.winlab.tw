import "server-only";
import { eq } from "drizzle-orm";
import type { Viewer } from "@/lib/auth/viewer";
import { asUser, db } from "@/lib/db";
import { competition_owners, files } from "@/lib/db/schema";
import { publicFileUrl, type Bucket } from "@/lib/files";

const MAX_BYTES = 10 * 1024 * 1024;

// Image types we accept, recognised by their first bytes, not by the name
// or the Content-Type the browser sent. No SVG: it can carry script.
const SIGNATURES: { type: string; ext: string; match: (b: Buffer) => boolean }[] = [
  { type: "image/jpeg", ext: "jpg", match: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { type: "image/png", ext: "png", match: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { type: "image/gif", ext: "gif", match: (b) => b.subarray(0, 4).toString("latin1") === "GIF8" },
  {
    type: "image/webp",
    ext: "webp",
    match: (b) => b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP",
  },
];

/** Folders under announcement-images, as the editors name them. */
export const IMAGE_PREFIXES = [
  "",
  "carousel/",
  "recruitment/",
  "results/",
  "events/",
  "organization/",
  "external-results/",
] as const;

async function ownsAnyCompetition(userId: string) {
  const [row] = await db
    .select({ id: competition_owners.competition_id })
    .from(competition_owners)
    .where(eq(competition_owners.user_id, userId))
    .limit(1);
  return Boolean(row);
}

/**
 * The storage policy "Insert announcement-images by prefix": admins upload
 * anywhere, anyone signed in under results/, recruitment owners under
 * recruitment/. external-results/ is new here: Supabase refused it to the
 * very people who own external results, so their image upload never worked.
 */
async function mayUploadImage(viewer: Viewer, prefix: string) {
  if (viewer.role === "admin") return true;
  if (prefix === "results/" || prefix === "external-results/") return true;
  if (prefix === "recruitment/") return ownsAnyCompetition(viewer.id);
  return false;
}

const randomName = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export type UploadResult = { ok: true; url?: string; path: string } | { ok: false; status: number; error: string };

export async function uploadImageFile(viewer: Viewer, prefix: string, data: Buffer): Promise<UploadResult> {
  if (!(IMAGE_PREFIXES as readonly string[]).includes(prefix)) return { ok: false, status: 400, error: "Unknown folder" };
  if (!(await mayUploadImage(viewer, prefix))) return { ok: false, status: 403, error: "Forbidden" };
  if (data.length > MAX_BYTES) return { ok: false, status: 413, error: "File too large" };
  const kind = SIGNATURES.find((s) => s.match(data));
  if (!kind) return { ok: false, status: 415, error: "Unsupported image type" };
  const path = `${prefix}${randomName()}.${kind.ext}`;
  await store(viewer, "announcement-images", path, kind.type, data);
  return { ok: true, url: publicFileUrl(path), path };
}

/** A resume goes under the owner's own folder, as the resumes_insert_own policy required. */
export async function uploadResumeFile(viewer: Viewer, data: Buffer): Promise<UploadResult> {
  if (data.length > MAX_BYTES) return { ok: false, status: 413, error: "File too large" };
  if (data.subarray(0, 5).toString("latin1") !== "%PDF-") return { ok: false, status: 415, error: "PDF only" };
  const path = `${viewer.id}/${randomName()}.pdf`;
  await store(viewer, "resumes", path, "application/pdf", data);
  return { ok: true, path };
}

async function store(viewer: Viewer, bucket: Bucket, path: string, contentType: string, data: Buffer) {
  await asUser(viewer.id, (tx) =>
    tx.insert(files).values({ bucket, path, content_type: contentType, size: data.length, data, owner_id: viewer.id }),
  );
}
