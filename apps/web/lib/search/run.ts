import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import type { Locale } from "@/lib/i18n/config";
import type { SearchResultRow } from "@/lib/search/types";

/** Runs search_site(); the function itself only matches published, live rows. */
export async function searchSite(query: string, locale: Locale): Promise<SearchResultRow[]> {
  const { rows } = await db.execute<SearchResultRow>(
    sql`select type, id, slug, event_slug, title, snippet, rank from search_site(${query}, ${locale})`,
  );
  return rows.map((r) => ({ ...r, rank: Number(r.rank) }));
}
