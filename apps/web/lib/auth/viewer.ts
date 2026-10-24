import "server-only";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";

export type Role = "admin" | "user" | "vendor" | "member" | "editor";

/** The signed-in person, as every permission check sees them. */
export type Viewer = { id: string; email: string; role: Role };

/**
 * The signed-in viewer, or null. Reads cookies, so server only; once per
 * request. Skips the 5-minute session cookie cache, so a deleted account or
 * a session revoked by a password reset stops working at once.
 */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const session = await auth.api.getSession({
    headers: await headers(),
    query: { disableCookieCache: true },
  });
  if (!session) return null;
  const [profile] = await db
    .select({ role: profiles.role })
    .from(profiles)
    .where(eq(profiles.id, session.user.id))
    .limit(1);
  // Every user has a profile (trigger); none means the account is gone.
  if (!profile) return null;
  return { id: session.user.id, email: session.user.email, role: profile.role as Role };
});

/** For pages: anyone signed out goes to /login. */
export async function requireViewer(): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  return viewer;
}

/** For pages: signed out goes to /login, any other role goes home. */
export async function requireRole(...roles: Role[]): Promise<Viewer> {
  const viewer = await requireViewer();
  if (!roles.includes(viewer.role)) redirect("/");
  return viewer;
}

export const requireAdmin = () => requireRole("admin");

/** Thrown by server actions; the caller shows a generic error. */
export class Forbidden extends Error {
  constructor() {
    super("Forbidden");
  }
}

/** For server actions and route handlers: throws instead of redirecting. */
export async function actor(...roles: Role[]): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer || (roles.length > 0 && !roles.includes(viewer.role))) throw new Forbidden();
  return viewer;
}
