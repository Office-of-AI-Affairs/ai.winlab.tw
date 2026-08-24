import { revalidateTag } from "next/cache";
import { timingSafeEqual } from "node:crypto";
import { createPublicClient } from "@/lib/supabase/public";

// Constant-time comparison, same pattern as app/api/revalidate/route.ts.
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export const dynamic = "force-dynamic";

// Vercel Cron (vercel.json) hits this every 5 minutes. Scheduled
// announcements (`status = 'published'`, `publish_at` in the future) become
// readable to anon/authenticated clients automatically once RLS's
// `publish_at <= now()` gate opens on its own — no app code required for
// that part. What RLS *can't* do is invalidate the `announcements-published`
// ISR cache tag (unstable_cache, revalidate: 3600), so without this route a
// scheduled post could sit invisible on the cached /announcement list and
// home page for up to an hour after go-live. This closes that gap down to
// the cron interval.
//
// Auth: Vercel automatically sends `Authorization: Bearer ${CRON_SECRET}` to
// any route listed under `crons` in vercel.json, as long as the CRON_SECRET
// env var is set on the project — see apps/web/CLAUDE.md.
export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return Response.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }

  const auth = req.headers.get("authorization");
  if (!auth || !safeEqual(auth, `Bearer ${expected}`)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  // Look-back window wider than the 5-minute cron cadence so a slow,
  // delayed, or briefly-failed run never misses a row that just went live.
  const lookback = new Date(now.getTime() - 10 * 60 * 1000);

  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("announcements")
    .select("id")
    .eq("status", "published")
    .not("publish_at", "is", null)
    .lte("publish_at", now.toISOString())
    .gte("publish_at", lookback.toISOString());

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const justWentLive = data ?? [];
  if (justWentLive.length > 0) {
    // { expire: 0 } = immediate invalidation, same profile /api/revalidate
    // uses for webhook-driven cache busts.
    revalidateTag("announcements-published", { expire: 0 });
  }

  return Response.json({ ok: true, revalidated: justWentLive.length > 0, count: justWentLive.length });
}
