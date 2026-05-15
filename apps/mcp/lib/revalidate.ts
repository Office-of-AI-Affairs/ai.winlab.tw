// Tells the web app's /api/revalidate route to flush one of its
// `unstable_cache` tags so MCP-side mutations show up immediately instead
// of waiting for the 1h ISR window. Best-effort: a network blip never
// fails the underlying mutation — the row is already in the DB, the cache
// will catch up on the next natural revalidate.

const WEB_BASE = process.env.WEB_BASE_URL ?? "https://ai.winlab.tw";
const SECRET = process.env.REVALIDATE_SECRET;
const TIMEOUT_MS = 5000;

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
  if (!SECRET) return;
  const list = Array.isArray(tags) ? tags : [tags];
  await Promise.all(
    list.map(async (tag) => {
      try {
        await fetch(`${WEB_BASE}/api/revalidate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SECRET}`,
          },
          body: JSON.stringify({ tag }),
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
      } catch (e) {
        console.error(`revalidate(${tag}) failed`, e);
      }
    }),
  );
}
