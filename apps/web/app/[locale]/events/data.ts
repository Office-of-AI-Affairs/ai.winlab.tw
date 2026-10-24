import { unstable_cache } from "next/cache";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema";
import type { Event } from "@winlab/db";

// Published events only; admin drafts merged client-side via useAuth.
export const getPublishedEvents = unstable_cache(
  async (): Promise<Event[]> =>
    db
      .select()
      .from(events)
      .where(eq(events.status, "published"))
      .orderBy(asc(events.sort_order), desc(events.created_at)),
  ["events-published"],
  { tags: ["events-published"], revalidate: 3600 },
);

// Home page grid caps at 6. Same tag as the full list so any event mutation
// invalidates both.
export const getFeaturedEvents = unstable_cache(
  async (): Promise<Event[]> =>
    db
      .select()
      .from(events)
      .where(eq(events.status, "published"))
      .orderBy(asc(events.sort_order), desc(events.created_at))
      .limit(6),
  ["events-featured"],
  { tags: ["events-published"], revalidate: 3600 },
);
