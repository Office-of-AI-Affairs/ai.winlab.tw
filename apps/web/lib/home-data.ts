import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import type { CarouselSlide, Contact } from "@winlab/db";

export const getCarouselSlides = unstable_cache(
  async (): Promise<CarouselSlide[]> => {
    const supabase = createPublicClient();
    const { data } = await supabase
      .from("carousel_slides")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    return (data as CarouselSlide[] | null) ?? [];
  },
  ["carousel-slides"],
  { tags: ["carousel-slides"], revalidate: 3600 },
);

export const getContacts = unstable_cache(
  async (): Promise<Contact[]> => {
    const supabase = createPublicClient();
    const { data } = await supabase
      .from("contacts")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    return (data as Contact[] | null) ?? [];
  },
  ["contacts"],
  { tags: ["contacts"], revalidate: 3600 },
);

export type HomeStats = {
  publishedResultsCount: number;
  eventsCount: number;
  eventParticipantsCount: number;
  industryPartnersCount: number;
};

// Four single-column count queries for the homepage stats band. No row data
// crosses the wire — head:true + count:"exact" makes each a metadata-only
// Postgres query. Tagged with the caches that already invalidate on the
// mutations most likely to move these numbers (over-invalidating on the
// rest is fine — see the isr-page skill's cross-tag invalidation trade-off).
export const getHomeStats = unstable_cache(
  async (): Promise<HomeStats> => {
    const supabase = createPublicClient();
    const [publishedResults, externalResults, events, eventParticipants, industryPartners] =
      await Promise.all([
        supabase
          .from("results")
          .select("*", { count: "exact", head: true })
          .eq("status", "published"),
        supabase.from("external_results").select("*", { count: "exact", head: true }),
        supabase
          .from("events")
          .select("*", { count: "exact", head: true })
          .eq("status", "published"),
        supabase.from("event_participants").select("*", { count: "exact", head: true }),
        supabase
          .from("organization_members")
          .select("*", { count: "exact", head: true })
          .eq("category", "industry"),
      ]);

    return {
      publishedResultsCount: (publishedResults.count ?? 0) + (externalResults.count ?? 0),
      eventsCount: events.count ?? 0,
      eventParticipantsCount: eventParticipants.count ?? 0,
      industryPartnersCount: industryPartners.count ?? 0,
    };
  },
  ["home-stats"],
  { tags: ["home-stats", "events-published", "organization-members"], revalidate: 3600 },
);
