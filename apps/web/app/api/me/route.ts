import { eq } from "drizzle-orm";
import { getViewer } from "@/lib/auth/viewer";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";

// The signed-in user and their profile, for AuthProvider. Pages stay
// cookieless (ISR); the browser asks here after mount.
export async function GET() {
  const viewer = await getViewer();
  const headers = { "Cache-Control": "private, no-store" };
  if (!viewer) return Response.json({ user: null, profile: null }, { headers });
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, viewer.id)).limit(1);
  return Response.json({ user: { id: viewer.id, email: viewer.email }, profile: profile ?? null }, { headers });
}
