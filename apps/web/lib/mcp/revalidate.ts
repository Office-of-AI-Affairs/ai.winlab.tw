import { revalidateTag } from "next/cache";

// MCP tools run inside this app, so they flush the web app's
// `unstable_cache` tags directly and mutations show up immediately instead
// of waiting for the 1h ISR window. Best-effort: a failure never fails the
// underlying mutation, because the row is already in the DB.

export type RevalidateTag =
  | "announcements-published"
  | "insights-published"
  | "events-published"
  | "pinned-events"
  | "introduction"
  | "organization-members"
  | "contacts"
  | "carousel-slides"
  | "privacy";

export async function revalidate(tags: RevalidateTag | RevalidateTag[]): Promise<void> {
  const list = Array.isArray(tags) ? tags : [tags];
  for (const tag of list) {
    try {
      revalidateTag(tag, { expire: 0 });
    } catch (e) {
      console.error(`revalidate(${tag}) failed`, e);
    }
  }
}
