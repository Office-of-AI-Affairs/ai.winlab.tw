import { unstable_cache } from "next/cache"
import { createPublicClient } from "@/lib/supabase/public"

export type PrivacyPolicySnapshot = {
  id: string
  version: number
  content: Record<string, unknown>
  created_at: string
}

/**
 * Returns the highest-versioned privacy policy row, or null if none exists.
 * Cookieless + cache-tagged so /privacy can keep rendering as ○ Static and
 * still flip within a request after `revalidatePrivacy()` updates the tag.
 */
export const getCurrentPrivacyPolicy = unstable_cache(
  async (): Promise<PrivacyPolicySnapshot | null> => {
    const supabase = createPublicClient()
    const { data } = await supabase
      .from("privacy_policy")
      .select("id, version, content, created_at")
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle()
    if (!data) return null
    return {
      id: data.id,
      version: data.version,
      content: (data.content as Record<string, unknown>) ?? {},
      created_at: data.created_at,
    }
  },
  ["privacy"],
  { tags: ["privacy"], revalidate: 3600 },
)
