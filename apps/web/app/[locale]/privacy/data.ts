import { unstable_cache } from "next/cache"
import { desc } from "drizzle-orm"
import { db } from "@/lib/db"
import { privacy_policy } from "@/lib/db/schema"

export type PrivacyPolicySnapshot = {
  id: string
  version: number
  content: Record<string, unknown>
  created_at: string
}

/**
 * Returns the highest-versioned privacy policy row, or null if none exists.
 * Cache-tagged so /privacy flips within a request after
 * `revalidatePrivacy()` updates the tag.
 */
export const getCurrentPrivacyPolicy = unstable_cache(
  async (): Promise<PrivacyPolicySnapshot | null> => {
    const [row] = await db
      .select({
        id: privacy_policy.id,
        version: privacy_policy.version,
        content: privacy_policy.content,
        created_at: privacy_policy.created_at,
      })
      .from(privacy_policy)
      .orderBy(desc(privacy_policy.version))
      .limit(1)
    if (!row) return null
    return { ...row, content: (row.content as Record<string, unknown>) ?? {} }
  },
  ["privacy"],
  { tags: ["privacy"], revalidate: 3600 },
)
