import type { SupabaseClient } from "@supabase/supabase-js";

/** RFC 4122 UUID (any version) — used to tell a legacy `/announcement/[id]`
 *  URL apart from a slug so the detail route can 301 old links forward. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

/**
 * Normalize a title into a URL path segment: trim, collapse internal
 * whitespace runs to a single hyphen, strip characters that are hostile
 * inside a URL path segment, and keep CJK characters as-is (no
 * transliteration). Mirrors the backfill logic in
 * `supabase/migrations/20260824000001_announcements_slug.sql` — keep the two
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

/**
 * Resolve a unique announcement slug for `title`, checking the live table.
 * Round-trips once per collision (rare in practice — most titles are
 * unique), same collision policy as the migration backfill.
 *
 * `excludeId` lets an update check uniqueness against every *other* row —
 * pass the announcement's own id when re-deriving a slug for an existing
 * draft that never got one.
 */
export async function generateUniqueAnnouncementSlug(
  supabase: SupabaseClient,
  title: string,
  excludeId?: string,
): Promise<string> {
  const base = toAnnouncementSlugBase(title);
  let candidate = base;
  let suffix = 1;
  for (;;) {
    let query = supabase.from("announcements").select("id").eq("slug", candidate).limit(1);
    if (excludeId) query = query.neq("id", excludeId);
    const { data } = await query.maybeSingle();
    if (!data) return candidate;
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
}
