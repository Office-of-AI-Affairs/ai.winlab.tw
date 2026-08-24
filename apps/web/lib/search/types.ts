/** Row shape returned by the `search_site(query, locale)` Postgres function
 *  (see `supabase/migrations/20260824000003_site_search.sql`). Already
 *  denormalized/ranked server-side — the client only groups and links. */
export type SearchResultType = "announcement" | "event" | "result";

export type SearchResultRow = {
  type: SearchResultType;
  id: string;
  slug: string | null;
  event_slug: string | null;
  title: string;
  snippet: string | null;
  rank: number;
};

export type SearchResultGroup = {
  type: SearchResultType;
  items: SearchResultRow[];
};
