import { revalidateTag } from "next/cache";
import { timingSafeEqual } from "node:crypto";

// Constant-time comparison so the Bearer secret can't be recovered by timing
// a byte-by-byte `!==`. Different lengths short-circuit (length isn't secret).
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

// Cache tags the web app actually owns. Reject everything else so a leaked
// secret can't, say, flush an unrelated tag added later.
const KNOWN_TAGS = new Set([
  "announcements-published",
  "insights-published",
  "events-published",
  "pinned-events",
  "introduction",
  "organization-members",
  "contacts",
  "carousel-slides",
  "privacy",
]);

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const expected = process.env.REVALIDATE_SECRET;
  if (!expected) {
    return Response.json(
      { error: "REVALIDATE_SECRET not configured" },
      { status: 500 },
    );
  }

  const auth = req.headers.get("authorization");
  if (!auth || !safeEqual(auth, `Bearer ${expected}`)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  let tag: unknown;
  try {
    const body = await req.json();
    tag = (body as { tag?: unknown }).tag;
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }

  if (typeof tag !== "string" || !KNOWN_TAGS.has(tag)) {
    return Response.json(
      { error: "unknown tag", known: Array.from(KNOWN_TAGS) },
      { status: 400 },
    );
  }

  // { expire: 0 } = immediate invalidation — Next 16's recommended profile for
  // webhook-driven invalidation from external services (which is what MCP is).
  // The deprecated single-arg form still half-works in Next 16 but TS rejects
  // it; "max" gives stale-while-revalidate (visitors see stale until they hit
  // a tagged page next), which is slower than what we want for fresh content.
  revalidateTag(tag, { expire: 0 });
  return Response.json({ ok: true, tag });
}
