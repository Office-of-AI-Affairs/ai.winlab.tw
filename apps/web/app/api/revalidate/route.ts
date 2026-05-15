import { updateTag } from "next/cache";

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
  if (auth !== `Bearer ${expected}`) {
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

  updateTag(tag);
  return Response.json({ ok: true, tag });
}
