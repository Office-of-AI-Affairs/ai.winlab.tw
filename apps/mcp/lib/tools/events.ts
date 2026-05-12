import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

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

export function registerEventTools(
  server: McpServer,
  supabase: SupabaseClient
) {
  // --- list_events ---
  server.tool(
    "list_events",
    {
      status: z.enum(["draft", "published"]).optional(),
      pinned: z.boolean().optional(),
      limit: z.number().int().positive().optional(),
      offset: z.number().int().nonnegative().optional(),
    },
    async ({ status, pinned, limit, offset }) => {
      let query = supabase
        .from("events")
        .select("*")
        .order("sort_order", { ascending: true })
        .range(offset ?? 0, (offset ?? 0) + (limit ?? 20) - 1);

      if (status) {
        query = query.eq("status", status);
      }

      if (pinned !== undefined) {
        query = query.eq("pinned", pinned);
      }

      const { data, error: dbError } = await query;

      if (dbError) {
        return error(dbError.message);
      }

      return success(data);
    }
  );

  // --- get_event ---
  server.tool(
    "get_event",
    {
      id: z.string().uuid().optional(),
      slug: z.string().optional(),
    },
    async ({ id, slug }) => {
      if (!id && !slug) {
        return error("Must provide either id or slug");
      }

      let query = supabase.from("events").select("*");

      if (id) {
        query = query.eq("id", id);
      } else {
        query = query.eq("slug", slug!);
      }

      const { data, error: dbError } = await query.single();

      if (dbError) {
        return error(dbError.message);
      }

      return success(data);
    }
  );

  // --- create_event ---
  server.tool(
    "create_event",
    {
      name: z.string(),
      slug: z.string(),
      description: z.string().optional(),
      cover_image: z.string().optional(),
      status: z.enum(["draft", "published"]).optional(),
      pinned: z.boolean().optional(),
      sort_order: z.number().int().optional(),
    },
    async ({ name, slug, description, cover_image, status, pinned, sort_order }) => {
      const { data, error: dbError } = await supabase
        .from("events")
        .insert({
          name,
          slug,
          description: description ?? null,
          cover_image: cover_image ?? null,
          status: status ?? "draft",
          pinned: pinned ?? false,
          sort_order: sort_order ?? 0,
        })
        .select()
        .single();

      if (dbError) {
        return error(dbError.message);
      }

      return success(data);
    }
  );

  // --- list_event_members ---
  // 列出某活動的成員（event_participants），合併 public_profiles 的 display_name /
  // has_profile_data，並透過 admin-gated `get_all_users` RPC 拿到 email + tags。
  // 用 has_profile_data=false 可篩出「尚無資料」的學員。
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
      if (!event_id && !slug) {
        return error("Must provide either event_id or slug");
      }

      let resolvedEventId = event_id;
      if (!resolvedEventId) {
        const { data: ev, error: evError } = await supabase
          .from("events")
          .select("id")
          .eq("slug", slug!)
          .single();
        if (evError) return error(evError.message);
        resolvedEventId = (ev as { id: string }).id;
      }

      const { data: participants, error: pError } = await supabase
        .from("event_participants")
        .select("user_id, created_at")
        .eq("event_id", resolvedEventId);
      if (pError) return error(pError.message);

      const ids = (participants ?? []).map((row: { user_id: string }) => row.user_id);
      if (ids.length === 0) return success([]);

      const [publicRes, usersRes] = await Promise.all([
        supabase
          .from("public_profiles")
          .select("id, display_name, avatar_url, has_profile_data")
          .in("id", ids),
        // SECURITY DEFINER RPC — caller 必須是 admin，否則直接 RAISE 'Access denied'
        supabase.rpc("get_all_users"),
      ]);

      if (publicRes.error) return error(publicRes.error.message);
      if (usersRes.error) {
        // Non-admin caller: degrade gracefully, drop email/tags
        const publicMap = new Map(
          ((publicRes.data as Array<{
            id: string;
            display_name: string | null;
            avatar_url: string | null;
            has_profile_data: boolean;
          }>) ?? []).map((row) => [row.id, row]),
        );
        const fallback = ids
          .map((id) => {
            const pub = publicMap.get(id);
            return {
              id,
              display_name: pub?.display_name ?? null,
              avatar_url: pub?.avatar_url ?? null,
              has_profile_data: pub?.has_profile_data ?? false,
              email: null as string | null,
              tags: null as string[] | null,
            };
          })
          .filter((m) =>
            has_profile_data === undefined ? true : m.has_profile_data === has_profile_data,
          );
        return success(fallback);
      }

      const publicMap = new Map(
        ((publicRes.data as Array<{
          id: string;
          display_name: string | null;
          avatar_url: string | null;
          has_profile_data: boolean;
        }>) ?? []).map((row) => [row.id, row]),
      );
      const userMap = new Map(
        ((usersRes.data as Array<{
          id: string;
          email: string | null;
          display_name: string | null;
          role: string;
          tags: string[] | null;
        }>) ?? []).map((row) => [row.id, row]),
      );

      const members = ids
        .map((id) => {
          const pub = publicMap.get(id);
          const user = userMap.get(id);
          return {
            id,
            display_name: pub?.display_name ?? user?.display_name ?? null,
            avatar_url: pub?.avatar_url ?? null,
            has_profile_data: pub?.has_profile_data ?? false,
            email: user?.email ?? null,
            tags: user?.tags ?? [],
          };
        })
        .filter((m) =>
          has_profile_data === undefined ? true : m.has_profile_data === has_profile_data,
        )
        .sort((a, b) => {
          if (a.has_profile_data !== b.has_profile_data) return a.has_profile_data ? -1 : 1;
          return (a.display_name ?? "").localeCompare(b.display_name ?? "");
        });

      return success(members);
    },
  );

  // --- update_event ---
  server.tool(
    "update_event",
    {
      id: z.string().uuid(),
      name: z.string().optional(),
      slug: z.string().optional(),
      description: z.string().optional(),
      cover_image: z.string().optional(),
      status: z.enum(["draft", "published"]).optional(),
      pinned: z.boolean().optional(),
      sort_order: z.number().int().optional(),
    },
    async ({ id, name, slug, description, cover_image, status, pinned, sort_order }) => {
      const updates: Record<string, unknown> = {};

      if (name !== undefined) updates.name = name;
      if (slug !== undefined) updates.slug = slug;
      if (description !== undefined) updates.description = description;
      if (cover_image !== undefined) updates.cover_image = cover_image;
      if (status !== undefined) updates.status = status;
      if (pinned !== undefined) updates.pinned = pinned;
      if (sort_order !== undefined) updates.sort_order = sort_order;

      if (Object.keys(updates).length === 0) {
        return error("No fields to update");
      }

      const { data, error: dbError } = await supabase
        .from("events")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (dbError) {
        return error(dbError.message);
      }

      return success(data);
    }
  );
}
