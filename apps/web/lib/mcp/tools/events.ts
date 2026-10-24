import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { getRow, insertRow, listRows, updateRow } from "@/lib/actions/rows";
import type { Viewer } from "@/lib/auth/viewer";
import { db } from "@/lib/db";
import { event_participants, profiles, public_profiles, user as users } from "@/lib/db/schema";
import { revalidate } from "@/lib/mcp/revalidate";
import { answer, defined, error, page, success } from "@/lib/mcp/tools/common";

export function registerEventTools(server: McpServer, viewer: Viewer) {
  server.tool(
    "list_events",
    {
      status: z.enum(["draft", "published"]).optional(),
      pinned: z.boolean().optional(),
      limit: z.number().int().positive().optional(),
      offset: z.number().int().nonnegative().optional(),
    },
    async ({ status, pinned, limit, offset }) => {
      const rows = await listRows("events", defined({ status, pinned }), [{ column: "sort_order" }]);
      return success(page(rows, null, limit, offset));
    },
  );

  server.tool(
    "get_event",
    { id: z.string().uuid().optional(), slug: z.string().optional() },
    async ({ id, slug }) => {
      if (!id && !slug) return error("Must provide either id or slug");
      return answer(await getRow("events", (id ?? slug)!));
    },
  );

  const fields = {
    name: z.string(),
    slug: z.string(),
    description: z.string().optional(),
    cover_image: z.string().optional(),
    status: z.enum(["draft", "published"]).optional(),
    pinned: z.boolean().optional(),
    sort_order: z.number().int().optional(),
  };

  server.tool("create_event", fields, async ({ description, cover_image, status, pinned, sort_order, ...rest }) => {
    const result = await insertRow("events", {
      ...rest,
      description: description ?? null,
      cover_image: cover_image ?? null,
      status: status ?? "draft",
      pinned: pinned ?? false,
      sort_order: sort_order ?? 0,
    });
    if (result.ok) await revalidate(["events-published", "pinned-events"]);
    return answer(result);
  });

  // Members are public (event_participants and public_profiles); email and
  // tags only for admins, as get_all_users allowed.
  server.tool(
    "list_event_members",
    {
      event_id: z.string().uuid().optional(),
      slug: z.string().optional(),
      has_profile_data: z
        .boolean()
        .optional()
        .describe("Filter by whether the member has filled in their profile (bio/social/etc)."),
    },
    async ({ event_id, slug, has_profile_data }) => {
      if (!event_id && !slug) return error("Must provide either event_id or slug");
      const event = await getRow("events", (event_id ?? slug)!);
      if (!event.ok) return error(event.error);
      const participants = await db
        .select({ user_id: event_participants.user_id })
        .from(event_participants)
        .where(eq(event_participants.event_id, String(event.row.id)));
      const ids = participants.map((p) => p.user_id);
      if (ids.length === 0) return success([]);
      const isAdmin = viewer.role === "admin";
      const rows = await db
        .select({
          id: public_profiles.id,
          display_name: public_profiles.display_name,
          avatar_url: public_profiles.avatar_url,
          has_profile_data: public_profiles.has_profile_data,
          email: users.email,
          tags: profiles.tags,
        })
        .from(public_profiles)
        .leftJoin(users, eq(users.id, public_profiles.id))
        .leftJoin(profiles, eq(profiles.id, public_profiles.id))
        .where(inArray(public_profiles.id, ids));
      const members = rows
        .map((m) => ({ ...m, email: isAdmin ? m.email : null, tags: isAdmin ? m.tags ?? [] : null }))
        .filter((m) => has_profile_data === undefined || m.has_profile_data === has_profile_data)
        .sort((a, b) => {
          if (a.has_profile_data !== b.has_profile_data) return a.has_profile_data ? -1 : 1;
          return (a.display_name ?? "").localeCompare(b.display_name ?? "");
        });
      return success(members);
    },
  );

  server.tool(
    "update_event",
    { id: z.string().uuid(), ...fields, name: z.string().optional(), slug: z.string().optional() },
    async ({ id, ...args }) => {
      const updates = defined(args);
      if (Object.keys(updates).length === 0) return error("No fields to update");
      const result = await updateRow("events", id, updates);
      if (result.ok) await revalidate(["events-published", "pinned-events"]);
      return answer(result);
    },
  );
}
