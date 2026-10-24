import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { files } from "@/lib/db/schema";

export type Bucket = "announcement-images" | "resumes";

/** Where a public image is served from; stored in rows and Tiptap JSON. */
export const publicFileUrl = (path: string) => `/files/announcement-images/${path}`;

export async function readFile(bucket: Bucket, path: string) {
  const [row] = await db
    .select({ data: files.data, content_type: files.content_type, owner_id: files.owner_id })
    .from(files)
    .where(and(eq(files.bucket, bucket), eq(files.path, path)))
    .limit(1);
  return row ?? null;
}
