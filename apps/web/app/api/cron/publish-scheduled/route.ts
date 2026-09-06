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

// Cache-invalidation hook for scheduled announcements — NOT the thing that
// publishes them. A row with `status = 'published'` and a past `publish_at`
// becomes readable on its own once RLS's `publish_at <= now()` gate opens,
// with no app code involved. What RLS can't do is invalidate the
// `announcements-published` ISR tag (unstable_cache, revalidate: 3600), so a
// scheduled post can sit invisible on the cached /announcement list and home
// page for up to an hour after go-live. Calling this route closes that gap.
//
// NOTHING CALLS THIS AUTOMATICALLY RIGHT NOW. It was wired to a Vercel Cron
// (`crons` in apps/web/vercel.json, every 5 minutes), but that cadence
// exceeds the Hobby plan's once-per-day limit and failed *every* production
// deployment from #77 onward. Since no announcement uses `publish_at` yet,
// the schedule was invalidating nothing while blocking every deploy, so it
// was removed rather than downgraded to daily. Scheduled publishing still
// works; the only cost is that a cached page can lag go-live by up to the 1h
// revalidate window. To get sub-hour freshness back: upgrade the Vercel plan
// and restore the `crons` entry, or call this route from an external
// scheduler with the bearer token below.
//
// Auth: expects `Authorization: Bearer ${CRON_SECRET}` (Vercel Cron sends it
// automatically for routes listed under `crons`) — see apps/web/CLAUDE.md.
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
