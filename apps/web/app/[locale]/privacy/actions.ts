"use server"

import { desc, eq, sql } from "drizzle-orm"
import { updateTag } from "next/cache"
import { actor } from "@/lib/auth/viewer"
import { asUser, db } from "@/lib/db"
import { privacy_policy, public_profiles } from "@/lib/db/schema"

export async function revalidatePrivacy() {
  updateTag("privacy")
}

export type PrivacyVersion = {
  id: string
  version: number
  content: Record<string, unknown>
  note: string | null
  created_at: string
  profiles: { display_name: string | null } | null
}

/** Every published version, newest first. The policy is public (RLS: true). */
export async function listPrivacyVersions(): Promise<PrivacyVersion[]> {
  const rows = await db
    .select({
      id: privacy_policy.id,
      version: privacy_policy.version,
      content: privacy_policy.content,
      note: privacy_policy.note,
      created_at: privacy_policy.created_at,
      display_name: public_profiles.display_name,
    })
    .from(privacy_policy)
    .leftJoin(public_profiles, eq(public_profiles.id, privacy_policy.created_by))
    .orderBy(desc(privacy_policy.version))
  return rows.map(({ display_name, ...row }) => ({
    ...row,
    content: (row.content as Record<string, unknown>) ?? {},
    profiles: { display_name },
  }))
}

/** "Admins can insert privacy policy versions". Versions only grow. */
export async function publishPrivacyVersion(input: {
  content: Record<string, unknown>
  note: string | null
}): Promise<{ ok: true; version: number; created_at: string } | { ok: false }> {
  const viewer = await actor("admin")
  if (!input || typeof input.content !== "object" || input.content === null) return { ok: false }
  const note = typeof input.note === "string" ? input.note.trim().slice(0, 500) || null : null
  const row = await asUser(viewer.id, async (tx) => {
    // One version number per publish, even with two admins at once.
    await tx.execute(sql`select pg_advisory_xact_lock(7240312)`)
    const [latest] = await tx
      .select({ version: privacy_policy.version })
      .from(privacy_policy)
      .orderBy(desc(privacy_policy.version))
      .limit(1)
    const [inserted] = await tx
      .insert(privacy_policy)
      .values({ content: input.content, version: (latest?.version ?? 0) + 1, note, created_by: viewer.id })
      .returning({ version: privacy_policy.version, created_at: privacy_policy.created_at })
    return inserted
  })
  updateTag("privacy")
  return { ok: true, ...row }
}
