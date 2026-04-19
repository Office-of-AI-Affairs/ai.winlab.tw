import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import type { Event } from "@/lib/supabase/types";

// Published events only; admin drafts merged client-side via useAuth.
export const getPublishedEvents = unstable_cache(
  async (): Promise<Event[]> => {
    const supabase = createPublicClient();
    const { data } = await supabase
      .from("events")
      .select("*")
      .eq("status", "published")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    return (data as Event[] | null) ?? [];
  },
  ["events-published"],
  { tags: ["events-published"], revalidate: 3600 },
);

// Home page grid caps at 6. Same tag as the full list so any event mutation
// invalidates both.
export const getFeaturedEvents = unstable_cache(
  async (): Promise<Event[]> => {
    const supabase = createPublicClient();
    const { data } = await supabase
      .from("events")
      .select("*")
      .eq("status", "published")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(6);
    return (data as Event[] | null) ?? [];
  },
  ["events-featured"],
  { tags: ["events-published"], revalidate: 3600 },
);
