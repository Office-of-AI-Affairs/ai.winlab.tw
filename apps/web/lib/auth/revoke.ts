import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { oauthAccessToken, oauthRefreshToken, user as users } from "@/lib/db/schema";

/**
 * Cuts every MCP client off from `userId`: their OAuth refresh and access
 * tokens go, and users.updated_at moves to now, which marks every access JWT
 * issued before it as revoked (tokenRevoked below). Called on password reset.
 */
export async function revokeOAuthTokens(userId: string): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.delete(oauthAccessToken).where(eq(oauthAccessToken.userId, userId));
    await tx.delete(oauthRefreshToken).where(eq(oauthRefreshToken.userId, userId));
    await tx.update(users).set({ updatedAt: new Date() }).where(eq(users.id, userId));
  });
}

/** True when an access JWT (iat in seconds) predates the user's last revocation. */
export async function tokenRevoked(userId: string, issuedAt: unknown): Promise<boolean> {
  if (typeof issuedAt !== "number") return true;
  const [row] = await db.select({ updatedAt: users.updatedAt }).from(users).where(eq(users.id, userId)).limit(1);
  if (!row) return true;
  // JWT iat has whole seconds; allow the same second.
  return issuedAt * 1000 < row.updatedAt.getTime() - 999;
}
