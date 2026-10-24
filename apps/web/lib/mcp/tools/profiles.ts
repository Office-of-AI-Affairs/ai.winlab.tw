import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { updateMyProfileField } from "@/lib/actions/profile";
import type { Viewer } from "@/lib/auth/viewer";
import { getProfilePageData } from "@/lib/data/profile";
import { db } from "@/lib/db";
import { public_profiles } from "@/lib/db/schema";
import { signedResumeUrl } from "@/lib/files/signed";
import { defined, error, page, success } from "@/lib/mcp/tools/common";

/** Your profile, with the resume as a link valid for an hour. */
async function myProfile(viewer: Viewer) {
  const data = await getProfilePageData(viewer.id, viewer);
  if (!data) return error("Not found");
  const resume = data.profile.resume;
  return success({
    ...data.profile,
    resume: resume && !/^https?:\/\//.test(resume) ? signedResumeUrl(resume) : resume,
  });
}

export function registerProfileTools(server: McpServer, viewer: Viewer) {
  server.tool("get_my_profile", {}, async () => myProfile(viewer));

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
    async (args) => {
      const updates = Object.entries(defined(args));
      if (updates.length === 0) return error("No fields to update");
      for (const [field, value] of updates) {
        const result = await updateMyProfileField(field, value ?? null);
        if (!result.ok) return error(result.error);
      }
      return myProfile(viewer);
    },
  );

  // public_profiles: the directory everyone may read.
  server.tool(
    "list_profiles",
    {
      role: z.enum(["admin", "user", "vendor", "member", "editor"]).optional(),
      limit: z.number().int().positive().optional(),
      offset: z.number().int().nonnegative().optional(),
    },
    async ({ role, limit, offset }) => {
      const rows = await db
        .select({
          id: public_profiles.id,
          display_name: public_profiles.display_name,
          avatar_url: public_profiles.avatar_url,
          role: public_profiles.role,
          created_at: public_profiles.created_at,
        })
        .from(public_profiles)
        .where(role ? eq(public_profiles.role, role) : undefined)
        .orderBy(desc(public_profiles.created_at));
      return success(page(rows, null, limit, offset));
    },
  );
}
