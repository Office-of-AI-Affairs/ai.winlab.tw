/** Shortest query the command palette / `/search` page will submit to
 *  `search_site()` — anything shorter is almost always noise (and for a
 *  single CJK character, `similarity()` against short trigram sets is
 *  unreliable). */
export const MIN_SEARCH_QUERY_LENGTH = 2;

/** Collapse internal whitespace runs and trim outer whitespace, so
 *  "  ai   forum " and "ai forum" build the same query and debounce key. */
export function normalizeSearchQuery(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

/** Whether a raw input string is worth sending to `search_site()`. */
export function isSearchQueryValid(raw: string): boolean {
  return normalizeSearchQuery(raw).length >= MIN_SEARCH_QUERY_LENGTH;
}
