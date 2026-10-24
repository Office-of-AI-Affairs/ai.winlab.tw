// Pure helpers for scheduled publishing (#47). No database/React imports —
// keep this file trivially unit-testable.

export type PublishGate = {
  status: string;
  publish_at: string | null;
};

/**
 * Whether a row should be visible to an anonymous/public reader right now.
 * Same predicate as `liveAnnouncement()` in lib/db/filters.ts
 * (`status = 'published' and (publish_at is null or publish_at <= now())`),
 * for rows already in the browser.
 */
export function isLive(row: PublishGate, now: Date = new Date()): boolean {
  if (row.status !== "published") return false;
  if (!row.publish_at) return true;
  const publishAt = new Date(row.publish_at).getTime();
  if (Number.isNaN(publishAt)) return true;
  return publishAt <= now.getTime();
}

/**
 * ISO timestamptz -> `<input type="datetime-local">` value, in the
 * browser's local timezone (the standard behavior of that input type).
 */
export function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * `<input type="datetime-local">` value -> ISO timestamptz, or null for an
 * empty/invalid value (= publish immediately / no schedule).
 */
export function fromDatetimeLocalValue(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}
