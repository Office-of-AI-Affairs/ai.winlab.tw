import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import type { Announcement } from "@/lib/supabase/types";

// Only fetches published + global (event_id IS NULL). Admin-only drafts are
// merged in on the client via useAuth so this cache stays visitor-safe.
export const getPublishedAnnouncements = unstable_cache(
  async (): Promise<Announcement[]> => {
    const supabase = createPublicClient();
    const { data } = await supabase
      .from("announcements")
      .select("*")
      .eq("status", "published")
      .is("event_id", null)
      .order("date", { ascending: false });
    return (data as Announcement[] | null) ?? [];
  },
  ["announcements-published"],
  { tags: ["announcements-published"], revalidate: 3600 },
);

// Home page wants only the 5 most recent; share the same cache tag so edits
// invalidate both variants at once.
export const getLatestAnnouncements = unstable_cache(
  async (): Promise<Announcement[]> => {
    const supabase = createPublicClient();
    const { data } = await supabase
      .from("announcements")
      .select("*")
      .eq("status", "published")
      .is("event_id", null)
      .order("date", { ascending: false })
      .limit(5);
    return (data as Announcement[] | null) ?? [];
  },
  ["announcements-latest"],
  { tags: ["announcements-published"], revalidate: 3600 },
);
