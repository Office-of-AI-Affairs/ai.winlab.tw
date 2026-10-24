import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { profiles, user as userTable } from "@/lib/db/schema";

export type Role = "admin" | "user" | "vendor" | "member" | "editor";

/** The signed-in person, as every permission check sees them. */
export type Viewer = { id: string; email: string; role: Role };

// An MCP request has no session cookie: the token names the user, and the
// tools run inside runAsViewer so every permission check sees that user.
const tokenViewer = new AsyncLocalStorage<Viewer>();

export const runAsViewer = <T>(viewer: Viewer, fn: () => T): T => tokenViewer.run(viewer, fn);

/** The viewer a user id stands for, with the role read now; null if the account is gone. */
export async function viewerById(userId: string): Promise<Viewer | null> {
  const [row] = await db
    .select({ role: profiles.role, email: userTable.email })
    .from(profiles)
    .innerJoin(userTable, eq(userTable.id, profiles.id))
    .where(eq(profiles.id, userId))
    .limit(1);
  return row ? { id: userId, email: row.email, role: row.role as Role } : null;
}

/**
 * The signed-in viewer, or null. Reads cookies, so server only; once per
 * request. Skips the 5-minute session cookie cache, so a deleted account or
 * a session revoked by a password reset stops working at once.
 */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const fromToken = tokenViewer.getStore();
  if (fromToken) return fromToken;
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
