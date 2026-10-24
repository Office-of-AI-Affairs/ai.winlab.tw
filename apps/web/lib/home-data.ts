import { unstable_cache } from "next/cache";
import { asc, count, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  carousel_slides,
  contacts,
  event_participants,
  events,
  external_results,
  organization_members,
  results,
} from "@/lib/db/schema";
import type { CarouselSlide, Contact } from "@winlab/db";

export const getCarouselSlides = unstable_cache(
  async (): Promise<CarouselSlide[]> =>
    db.select().from(carousel_slides).orderBy(asc(carousel_slides.sort_order), asc(carousel_slides.created_at)),
  ["carousel-slides"],
  { tags: ["carousel-slides"], revalidate: 3600 },
);

export const getContacts = unstable_cache(
  async (): Promise<Contact[]> =>
    db.select().from(contacts).orderBy(asc(contacts.sort_order), asc(contacts.created_at)),
  ["contacts"],
  { tags: ["contacts"], revalidate: 3600 },
);

export type HomeStats = {
  publishedResultsCount: number;
  eventsCount: number;
  eventParticipantsCount: number;
  industryPartnersCount: number;
};

// Count queries for the homepage stats band. Tagged with the caches that
// already invalidate on the mutations most likely to move these numbers
// (over-invalidating on the rest is fine — see the isr-page skill's
// cross-tag invalidation trade-off).
export const getHomeStats = unstable_cache(
  async (): Promise<HomeStats> => {
    const [[published], [external], [eventCount], [participants], [industry]] = await Promise.all([
      db.select({ n: count() }).from(results).where(eq(results.status, "published")),
      db.select({ n: count() }).from(external_results),
      db.select({ n: count() }).from(events).where(eq(events.status, "published")),
      db.select({ n: count() }).from(event_participants),
      db.select({ n: count() }).from(organization_members).where(eq(organization_members.category, "industry")),
    ]);

    return {
      publishedResultsCount: published.n + external.n,
      eventsCount: eventCount.n,
      eventParticipantsCount: participants.n,
      industryPartnersCount: industry.n,
    };
  },
  ["home-stats"],
  { tags: ["home-stats", "events-published", "organization-members"], revalidate: 3600 },
);
