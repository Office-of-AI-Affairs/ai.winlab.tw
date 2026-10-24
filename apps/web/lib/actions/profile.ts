"use server";

import { eq } from "drizzle-orm";
import { actor } from "@/lib/auth/viewer";
import { asUser, db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import type { Profile } from "@winlab/db";

// Your own profile. RLS let you update your own row as long as the role
// stayed the same; role is not among these fields at all.

const TEXT_FIELDS = ["display_name", "bio", "phone", "linkedin", "facebook", "github", "website", "resume"] as const;
type TextField = (typeof TEXT_FIELDS)[number];

export type ProfileResult = { ok: true; profile: Profile } | { ok: false; error: string };

async function myProfile(userId: string): Promise<Profile> {
  const [row] = await db
    .select({
      id: profiles.id,
      created_at: profiles.created_at,
      updated_at: profiles.updated_at,
      role: profiles.role,
      display_name: profiles.display_name,
      avatar_url: profiles.avatar_url,
      bio: profiles.bio,
      phone: profiles.phone,
      linkedin: profiles.linkedin,
      facebook: profiles.facebook,
      github: profiles.github,
      website: profiles.website,
      resume: profiles.resume,
      social_links: profiles.social_links,
    })
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1);
  return row as Profile;
}

export async function updateMyProfileField(field: string, value: string | null): Promise<ProfileResult> {
  const viewer = await actor();
  if (!(TEXT_FIELDS as readonly string[]).includes(field)) return { ok: false, error: "Unknown field" };
  const clean = typeof value === "string" ? value.trim().slice(0, 5000) || null : null;
  // A resume is a path the upload route made under your own folder.
  if (field === "resume" && clean !== null && (!clean.startsWith(`${viewer.id}/`) || clean.includes(".."))) {
    return { ok: false, error: "Invalid resume" };
  }
  await asUser(viewer.id, (tx) =>
    tx.update(profiles).set({ [field as TextField]: clean }).where(eq(profiles.id, viewer.id)),
  );
  return { ok: true, profile: await myProfile(viewer.id) };
}

/** Links live in social_links; the old single-site columns are cleared. */
export async function updateMyLinks(links: string[]): Promise<ProfileResult> {
  const viewer = await actor();
  if (!Array.isArray(links) || links.length > 30 || links.some((l) => typeof l !== "string" || l.length > 500)) {
    return { ok: false, error: "Invalid links" };
  }
  const filtered = links.map((l) => l.trim()).filter(Boolean);
  await asUser(viewer.id, (tx) =>
    tx
      .update(profiles)
      .set({ social_links: filtered, linkedin: null, facebook: null, github: null, website: null })
      .where(eq(profiles.id, viewer.id)),
  );
  return { ok: true, profile: await myProfile(viewer.id) };
}
