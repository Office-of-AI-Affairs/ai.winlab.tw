import "server-only";
import { and, eq, isNull, lte, or, sql } from "drizzle-orm";
import { announcements } from "@/lib/db/schema";

/**
 * Announcements a visitor may see now: published, and either unscheduled or
 * past publish_at (#47). The RLS policy enforced this under Supabase; now
 * this filter is the only gate, so every public announcement read uses it.
 */
export const liveAnnouncement = () =>
  and(
    eq(announcements.status, "published"),
    or(isNull(announcements.publish_at), lte(announcements.publish_at, sql`now()`)),
  );
