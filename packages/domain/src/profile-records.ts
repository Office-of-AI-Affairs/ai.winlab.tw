import type { Profile, PublicProfile } from "@winlab/db";

// public_profiles mirrors display fields from profiles via trigger (2026-05-18).
// composeProfile falls back to the public mirror when the caller doesn't have
// row access to profiles itself — viewer != target, viewer != admin, viewer
// != recruitment_owner-of-applicant.
export function composeProfile(
  publicProfile: PublicProfile,
  privateProfile?: Partial<Profile> | null
): Profile {
  return {
    id: publicProfile.id,
    created_at: privateProfile?.created_at ?? publicProfile.created_at,
    updated_at: privateProfile?.updated_at ?? publicProfile.updated_at,
    display_name: privateProfile?.display_name ?? publicProfile.display_name,
    avatar_url: privateProfile?.avatar_url ?? publicProfile.avatar_url ?? null,
    role: privateProfile?.role ?? publicProfile.role ?? "user",
    phone: privateProfile?.phone ?? null,
    bio: privateProfile?.bio ?? publicProfile.bio ?? null,
    linkedin: privateProfile?.linkedin ?? publicProfile.linkedin ?? null,
    facebook: privateProfile?.facebook ?? publicProfile.facebook ?? null,
    github: privateProfile?.github ?? publicProfile.github ?? null,
    website: privateProfile?.website ?? publicProfile.website ?? null,
    resume: privateProfile?.resume ?? publicProfile.resume ?? null,
    social_links: privateProfile?.social_links ?? publicProfile.social_links ?? [],
  }
}
