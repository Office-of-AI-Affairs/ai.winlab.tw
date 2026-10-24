import { unstable_cache } from "next/cache";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema";

export type PinnedEventNavItem = { name: string; name_en: string | null; slug: string };

// Cached across all requests. Admin pin toggles currently propagate on the
// 1h revalidate window — call revalidateTag("pinned-events") from the event
// edit save path if we need faster turnaround.
export const getPinnedEvents = unstable_cache(
  async (): Promise<PinnedEventNavItem[]> =>
    db
      .select({ name: events.name, name_en: events.name_en, slug: events.slug })
      .from(events)
      .where(and(eq(events.pinned, true), eq(events.status, "published")))
      .orderBy(asc(events.sort_order)),
  ["pinned-events"],
  { tags: ["pinned-events"], revalidate: 3600 },
);
