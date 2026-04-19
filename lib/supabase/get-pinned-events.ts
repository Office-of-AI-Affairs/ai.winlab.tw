import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";

export type PinnedEventNavItem = { name: string; slug: string };

async function fetchPinnedEvents(): Promise<PinnedEventNavItem[]> {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("events")
    .select("name, slug")
    .eq("pinned", true)
    .eq("status", "published")
    .order("sort_order", { ascending: true });
  return (data as PinnedEventNavItem[] | null) ?? [];
}

// Cached across all requests. Admin pin toggles currently propagate on the
// 1h revalidate window — call revalidateTag("pinned-events") from the event
// edit save path if we need faster turnaround.
export const getPinnedEvents = unstable_cache(
  fetchPinnedEvents,
  ["pinned-events"],
  { tags: ["pinned-events"], revalidate: 3600 },
);
