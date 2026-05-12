import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { composeProfile } from "@/lib/profile-records";
import type { Profile, PublicProfile } from "@/lib/supabase/types";

const RESUME_BUCKET = "resumes";
const RESUME_SIGNED_TTL_SEC = 3600;

// profiles.resume stores an object path (e.g. "<uid>/xxx.pdf") since the
// migration to the private resumes bucket. Pre-migration rows may still
// carry an absolute URL — keep those as-is for backward compat.
async function resolveResumeUrl(
  supabase: SupabaseClient,
  resume: string | null | undefined,
): Promise<string | null> {
  if (!resume) return null;
  if (resume.startsWith("http://") || resume.startsWith("https://")) return resume;
  const { data } = await supabase.storage
    .from(RESUME_BUCKET)
    .createSignedUrl(resume, RESUME_SIGNED_TTL_SEC);
  return data?.signedUrl ?? null;
}

function success(data: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({ success: true, data }),
      },
    ],
  };
}

function error(message: string) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({ success: false, error: message }),
      },
    ],
    isError: true,
  };
}

export function registerProfileTools(
  server: McpServer,
  supabase: SupabaseClient,
  userId: string
) {
  // --- get_my_profile ---
  server.tool("get_my_profile", {}, async () => {
    const [publicRes, privateRes] = await Promise.all([
      supabase
        .from("public_profiles")
        .select("id, created_at, updated_at, display_name")
        .eq("id", userId)
        .single(),
      supabase
        .from("profiles")
        .select("id, created_at, updated_at, display_name, avatar_url, role, bio, phone, linkedin, facebook, github, website, resume, social_links")
        .eq("id", userId)
        .single(),
    ]);

    if (publicRes.error) {
      return error(publicRes.error.message);
    }

    if (privateRes.error) {
      return error(privateRes.error.message);
    }

    const privateProfile = privateRes.data as Profile;
    const resumeUrl = await resolveResumeUrl(supabase, privateProfile.resume);

    const data = composeProfile(
      publicRes.data as PublicProfile,
      { ...privateProfile, resume: resumeUrl }
    );

    return success(data);
  });

  // --- update_my_profile ---
  server.tool(
    "update_my_profile",
    {
      display_name: z.string().optional(),
      bio: z.string().optional(),
      phone: z.string().optional(),
      linkedin: z.string().optional(),
      github: z.string().optional(),
      website: z.string().optional(),
      facebook: z.string().optional(),
    },
    async ({ display_name, bio, phone, linkedin, github, website, facebook }) => {
      const publicUpdates: Record<string, unknown> = {};
      const privateUpdates: Record<string, unknown> = {};

      if (display_name !== undefined) {
        publicUpdates.display_name = display_name;
        privateUpdates.display_name = display_name;
      }
      if (bio !== undefined) privateUpdates.bio = bio;
      if (phone !== undefined) privateUpdates.phone = phone;
      if (linkedin !== undefined) privateUpdates.linkedin = linkedin;
      if (github !== undefined) privateUpdates.github = github;
      if (website !== undefined) privateUpdates.website = website;
      if (facebook !== undefined) privateUpdates.facebook = facebook;

      if (Object.keys(publicUpdates).length === 0 && Object.keys(privateUpdates).length === 0) {
        return error("No fields to update");
      }

      if (Object.keys(publicUpdates).length > 0) {
        const { error: publicError } = await supabase
          .from("public_profiles")
          .update(publicUpdates)
          .eq("id", userId);

        if (publicError) {
          return error(publicError.message);
        }
      }

      if (Object.keys(privateUpdates).length > 0) {
        const { error: privateError } = await supabase
          .from("profiles")
          .update(privateUpdates)
          .eq("id", userId);

        if (privateError) {
          return error(privateError.message);
        }
      }

      const [publicRes, privateRes] = await Promise.all([
        supabase
          .from("public_profiles")
          .select("id, created_at, updated_at, display_name")
          .eq("id", userId)
          .single(),
        supabase
          .from("profiles")
          .select("id, created_at, updated_at, display_name, avatar_url, role, bio, phone, linkedin, facebook, github, website, resume, social_links")
          .eq("id", userId)
          .single(),
      ]);

      if (publicRes.error) {
        return error(publicRes.error.message);
      }

      if (privateRes.error) {
        return error(privateRes.error.message);
      }

      const privateProfile = privateRes.data as Profile;
      const resumeUrl = await resolveResumeUrl(supabase, privateProfile.resume);

      return success(
        composeProfile(publicRes.data as PublicProfile, { ...privateProfile, resume: resumeUrl })
      );
    }
  );

  // --- list_profiles ---
  server.tool(
    "list_profiles",
    {
      role: z.enum(["admin", "user", "vendor"]).optional(),
      limit: z.number().int().positive().optional(),
      offset: z.number().int().nonnegative().optional(),
    },
    async ({ role, limit, offset }) => {
      let query = supabase
        .from("profiles")
        .select("id, role, created_at")
        .order("created_at", { ascending: false })
        .range(offset ?? 0, (offset ?? 0) + (limit ?? 20) - 1);

      if (role) {
        query = query.eq("role", role);
      }

      const { data, error: dbError } = await query;

      if (dbError) {
        return error(dbError.message);
      }

      const rows = data ?? [];

      if (rows.length === 0) {
        return success([]);
      }

      const { data: publicProfiles, error: publicError } = await supabase
        .from("public_profiles")
        .select("id, display_name")
        .in("id", rows.map((row) => row.id));

      if (publicError) {
        return error(publicError.message);
      }

      const publicMap = new Map(
        ((publicProfiles as PublicProfile[] | null) ?? []).map((row) => [row.id, row])
      );

      return success(
        rows.map((row) => ({
          id: row.id,
          display_name: publicMap.get(row.id)?.display_name ?? null,
          avatar_url: null,
          role: row.role,
          created_at: row.created_at,
        }))
      );
    }
  );
}
