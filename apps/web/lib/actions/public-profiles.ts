"use server";

import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { public_profiles } from "@/lib/db/schema";
import { isUuid } from "@/lib/slug";
import type { PublicProfile } from "@winlab/db";

// public_profiles is public (RLS: true), so these need no viewer.

/**
 * Everyone's public profile, for the member and coauthor pickers. Only the
 * columns the pickers use, as before; the type is the full row.
 */
export async function listPublicProfiles(): Promise<PublicProfile[]> {
  const rows = await db
    .select({
      id: public_profiles.id,
      created_at: public_profiles.created_at,
      updated_at: public_profiles.updated_at,
      display_name: public_profiles.display_name,
      avatar_url: public_profiles.avatar_url,
      has_profile_data: public_profiles.has_profile_data,
    })
    .from(public_profiles)
    .orderBy(asc(public_profiles.display_name));
  return rows as unknown as PublicProfile[];
}

export async function getPublicName(userId: string): Promise<string | null> {
  if (!isUuid(userId)) return null;
  const [row] = await db
    .select({ display_name: public_profiles.display_name })
    .from(public_profiles)
    .where(eq(public_profiles.id, userId))
    .limit(1);
  return row?.display_name ?? null;
}
