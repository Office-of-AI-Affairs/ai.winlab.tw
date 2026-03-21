import type { Profile, PublicProfile } from "@/lib/supabase/types"

export function composeProfile(
  publicProfile: PublicProfile,
  privateProfile?: Partial<Profile> | null
): Profile {
  return {
    id: publicProfile.id,
    created_at: privateProfile?.created_at ?? publicProfile.created_at,
    updated_at: privateProfile?.updated_at ?? publicProfile.updated_at,
    display_name: privateProfile?.display_name ?? publicProfile.display_name,
    avatar_url: privateProfile?.avatar_url ?? null,
    role: privateProfile?.role ?? "user",
    phone: privateProfile?.phone ?? null,
    bio: privateProfile?.bio ?? null,
    linkedin: privateProfile?.linkedin ?? null,
    facebook: privateProfile?.facebook ?? null,
    github: privateProfile?.github ?? null,
    website: privateProfile?.website ?? null,
    resume: privateProfile?.resume ?? null,
    social_links: privateProfile?.social_links ?? [],
  }
}
