import { mkdir, rm, symlink } from "node:fs/promises";
import path from "node:path";

/**
 * Next keeps optimized images in .next/cache/images, inside the release, so
 * every deploy starts empty and each image is encoded again on first view.
 * When IMAGE_CACHE_DIR is set, point that folder at it before the server
 * takes requests (called from instrumentation.ts). Carrel refuses release
 * archives with links that leave the release, so the link is made here.
 */
export async function linkImageCacheDir(): Promise<void> {
  const target = process.env.IMAGE_CACHE_DIR;
  if (!target) return;
  const link = path.join(process.cwd(), ".next", "cache", "images");
  try {
    await mkdir(target, { recursive: true });
    await mkdir(path.dirname(link), { recursive: true });
    await rm(link, { recursive: true, force: true });
    await symlink(target, link);
  } catch (error) {
    // A cold cache is slow, not broken: keep serving.
    console.error("image cache link failed", error);
  }
}
