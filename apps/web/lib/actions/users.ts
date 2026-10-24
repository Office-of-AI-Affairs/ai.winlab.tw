"use server";

import { desc, eq } from "drizzle-orm";
import { actor, type Role } from "@/lib/auth/viewer";
import { asUser, db } from "@/lib/db";
import { profiles, user as users } from "@/lib/db/schema";
import { isUuid } from "@/lib/db/uuid";
import type { UserRow } from "@/components/admin/users-table";

// Admin user management. Each action checks the caller itself: a server
// action is a public endpoint, whatever page shows its button.

const ROLES: Role[] = ["admin", "user", "vendor", "member", "editor"];

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function listUsers(): Promise<UserRow[]> {
  await actor("admin");
  const rows = await db
    .select({
      id: profiles.id,
      email: users.email,
      display_name: profiles.display_name,
      role: profiles.role,
      created_at: profiles.created_at,
      tags: profiles.tags,
    })
    .from(profiles)
    .innerJoin(users, eq(users.id, profiles.id))
    .orderBy(desc(profiles.created_at));
  return rows.map((r) => ({ ...r, role: r.role as Role }));
}

/**
 * Creates an account with no password, as admin_create_user did with a
 * random one: the person sets it through "forgot password". The users
 * trigger creates the profile.
 */
async function insertUser(by: string, email: string, name: string, role: Role): Promise<"created" | "exists"> {
  const clean = email.trim().toLowerCase();
  return asUser(by, async (tx) => {
    const [created] = await tx
      .insert(users)
      .values({ id: crypto.randomUUID(), email: clean, name: name.trim(), emailVerified: true })
      .onConflictDoNothing({ target: users.email })
      .returning({ id: users.id });
    if (!created) return "exists";
    await tx
      .update(profiles)
      .set({ role, display_name: name.trim() || null })
      .where(eq(profiles.id, created.id));
    return "created";
  });
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_NAME = 100;
const MAX_TAG = 50;

const validEmail = (value: unknown): boolean =>
  typeof value === "string" && value.trim().length <= 254 && EMAIL.test(value.trim());
const cleanName = (value: unknown) => (typeof value === "string" ? value.trim().slice(0, MAX_NAME) : "");

export async function createUser(input: { email: string; name: string; role: string }): Promise<ActionResult> {
  const viewer = await actor("admin");
  if (!validEmail(input?.email)) return { ok: false, error: "Invalid email" };
  if (!ROLES.includes(input.role as Role)) return { ok: false, error: `Invalid role: ${input.role}` };
  const result = await insertUser(viewer.id, input.email, cleanName(input.name), input.role as Role);
  if (result === "exists") return { ok: false, error: `Email already registered: ${input.email.trim().toLowerCase()}` };
  return { ok: true };
}

export async function importUsers(
  rows: { name?: string; email: string }[],
): Promise<{ created: number; skipped: number; errors: string[] }> {
  const viewer = await actor("admin");
  let created = 0;
  let skipped = 0;
  const errors: string[] = [];
  for (const row of Array.isArray(rows) ? rows.slice(0, 1000) : []) {
    const email = typeof row?.email === "string" ? row.email.trim() : "";
    if (!email) continue;
    if (!validEmail(email)) {
      errors.push(`${email.slice(0, 254)}: invalid email`);
      continue;
    }
    const result = await insertUser(viewer.id, email, cleanName(row.name), "user");
    if (result === "created") created++;
    else skipped++;
  }
  return { created, skipped, errors };
}

export async function deleteUser(userId: string): Promise<ActionResult> {
  const viewer = await actor("admin");
  if (!isUuid(userId)) return { ok: false, error: "User not found" };
  if (userId === viewer.id) return { ok: false, error: "Cannot delete your own account" };
  // Profiles, sessions and accounts go with the user (ON DELETE CASCADE).
  const deleted = await asUser(viewer.id, (tx) =>
    tx.delete(users).where(eq(users.id, userId)).returning({ id: users.id }),
  );
  return deleted.length ? { ok: true } : { ok: false, error: "User not found" };
}

export async function setUserRole(userId: string, role: string): Promise<ActionResult> {
  const viewer = await actor("admin");
  if (!isUuid(userId) || !ROLES.includes(role as Role)) return { ok: false, error: "Invalid role" };
  if (userId === viewer.id && role !== "admin") return { ok: false, error: "Cannot remove your own admin role" };
  const updated = await asUser(viewer.id, (tx) =>
    tx.update(profiles).set({ role }).where(eq(profiles.id, userId)).returning({ id: profiles.id }),
  );
  return updated.length ? { ok: true } : { ok: false, error: "User not found" };
}

export async function setUserTags(userId: string, tags: string[]): Promise<ActionResult> {
  const viewer = await actor("admin");
  if (
    !isUuid(userId) ||
    !Array.isArray(tags) ||
    tags.length > 50 ||
    tags.some((t) => typeof t !== "string" || t.trim().length > MAX_TAG)
  ) {
    return { ok: false, error: "Invalid tags" };
  }
  const clean = [...new Set(tags.map((t) => t.trim()).filter(Boolean))];
  const updated = await asUser(viewer.id, (tx) =>
    tx.update(profiles).set({ tags: clean }).where(eq(profiles.id, userId)).returning({ id: profiles.id }),
  );
  return updated.length ? { ok: true } : { ok: false, error: "User not found" };
}
