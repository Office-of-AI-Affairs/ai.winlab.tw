// Pure helpers for the version-history feature (#47). `content_revisions
// .snapshot` is jsonb — untyped from Supabase's point of view — so the
// History panel needs a defensive parser rather than trusting the shape.
// No Supabase/React imports; trivially unit-testable.

export type AnnouncementRevisionSnapshot = {
  title: string | null;
  title_en: string | null;
  content: Record<string, unknown> | null;
  status: string | null;
  publish_at: string | null;
  category: string | null;
  date: string | null;
};

export type ResultRevisionSnapshot = {
  title: string | null;
  title_en: string | null;
  content: Record<string, unknown> | null;
  status: string | null;
  date: string | null;
};

function asRecord(raw: unknown): Record<string, unknown> {
  return raw !== null && typeof raw === "object" && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : {};
}

function str(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function jsonObject(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/** Matches the field set written by record_content_revision() for `announcements`. */
export function parseAnnouncementRevisionSnapshot(raw: unknown): AnnouncementRevisionSnapshot {
  const obj = asRecord(raw);
  return {
    title: str(obj.title),
    title_en: str(obj.title_en),
    content: jsonObject(obj.content),
    status: str(obj.status),
    publish_at: str(obj.publish_at),
    category: str(obj.category),
    date: str(obj.date),
  };
}

/** Matches the field set written by record_content_revision() for `results`. */
export function parseResultRevisionSnapshot(raw: unknown): ResultRevisionSnapshot {
  const obj = asRecord(raw);
  return {
    title: str(obj.title),
    title_en: str(obj.title_en),
    content: jsonObject(obj.content),
    status: str(obj.status),
    date: str(obj.date),
  };
}
