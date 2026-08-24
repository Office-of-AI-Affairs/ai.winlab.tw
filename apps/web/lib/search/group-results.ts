import type { SearchResultGroup, SearchResultRow, SearchResultType } from "./types";

/** Display order for grouped results — announcements first (most time-
 *  sensitive), then events, then results. */
export const GROUP_ORDER: SearchResultType[] = ["announcement", "event", "result"];

/**
 * Group flat `search_site()` rows by content type, preserving each row's
 * relative order within its group (the server already ranks rows, and rows
 * of the same type stay in rank order after grouping). Empty groups are
 * omitted — the caller renders exactly the sections that have hits.
 */
export function groupSearchResults(rows: SearchResultRow[]): SearchResultGroup[] {
  const buckets = new Map<SearchResultType, SearchResultRow[]>();

  for (const row of rows) {
    const bucket = buckets.get(row.type);
    if (bucket) {
      bucket.push(row);
    } else {
      buckets.set(row.type, [row]);
    }
  }

  return GROUP_ORDER.filter((type) => buckets.has(type)).map((type) => ({
    type,
    items: buckets.get(type)!,
  }));
}

/** Total hit count across all groups — for the "N results" summary line. */
export function countSearchResults(rows: SearchResultRow[]): number {
  return rows.length;
}
