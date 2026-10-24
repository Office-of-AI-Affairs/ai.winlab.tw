/** RFC 4122 UUID (any version) — used to tell a legacy `/announcement/[id]`
 *  URL apart from a slug so the detail route can 301 old links forward. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

/**
 * Normalize a title into a URL path segment: trim, collapse internal
 * whitespace runs to a single hyphen, strip characters that are hostile
 * inside a URL path segment, and keep CJK characters as-is (no
 * transliteration). Mirrors the backfill logic in
 * `announcement_slug_from_title()` in `drizzle/0001_baseline.sql` — keep the two
 * in sync if this changes.
 *
 * Returns "" for titles that normalize away entirely (e.g. all punctuation);
 * callers should fall back to a generic base like "announcement" in that case.
 */
export function normalizeSlugBase(title: string): string {
  return title
    .trim()
    .replace(/[ \t\n\r]+/g, "-")
    .replace(/[/?#%&+="'<>　]/g, "")
    .replace(/^-+|-+$/g, "");
}

/** `normalizeSlugBase` with the empty-result fallback used by announcements. */
export function toAnnouncementSlugBase(title: string): string {
  return normalizeSlugBase(title) || "announcement";
}

/**
 * Given a desired base slug and the set of slugs already taken, return the
 * first free candidate: the bare base if it's free, otherwise
 * "<base>-2", "<base>-3", … (the first duplicate becomes "-2", not "-1").
 */
export function nextSlugCandidate(base: string, taken: ReadonlySet<string>): string {
  if (!taken.has(base)) return base;
  let suffix = 2;
  while (taken.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

