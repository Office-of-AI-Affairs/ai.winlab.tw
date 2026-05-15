"use server";

import { updateTag } from "next/cache";

// Server Action wrapper. updateTag works here but crashes from a plain
// route handler — same context constraint as the cache-tag invalidation
// helpers used by the domain `actions.ts` files.
export async function doRevalidate(tag: string): Promise<void> {
  updateTag(tag);
}
