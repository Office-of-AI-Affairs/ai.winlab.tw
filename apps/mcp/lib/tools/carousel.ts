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

export function registerCarouselTools(
  server: McpServer,
  supabase: SupabaseClient
) {
  // --- list_carousel ---
  server.tool("list_carousel", {}, async () => {
    const { data, error: dbError } = await supabase
      .from("carousel")
      .select("*")
      .order("sort_order", { ascending: true });

    if (dbError) {
      return error(dbError.message);
    }

    return success(data);
  });

  // --- create_carousel_slide ---
  server.tool(
    "create_carousel_slide",
    {
      title: z.string(),
      description: z.string().optional(),
      link: z.string().optional(),
      image: z.string().optional(),
      sort_order: z.number().int().optional(),
    },
    async ({ title, description, link, image, sort_order }) => {
      const row: Record<string, unknown> = { title };

      if (description !== undefined) row.description = description;
      if (link !== undefined) row.link = link;
      if (image !== undefined) row.image = image;
      if (sort_order !== undefined) row.sort_order = sort_order;

      const { data, error: dbError } = await supabase
        .from("carousel")
        .insert(row)
        .select()
        .single();

      if (dbError) {
        return error(dbError.message);
      }

      return success(data);
    }
  );

  // --- update_carousel_slide ---
  server.tool(
    "update_carousel_slide",
    {
      id: z.string().uuid(),
      title: z.string().optional(),
      description: z.string().optional(),
      link: z.string().optional(),
      image: z.string().optional(),
      sort_order: z.number().int().optional(),
    },
    async ({ id, title, description, link, image, sort_order }) => {
      const updates: Record<string, unknown> = {};

      if (title !== undefined) updates.title = title;
      if (description !== undefined) updates.description = description;
      if (link !== undefined) updates.link = link;
      if (image !== undefined) updates.image = image;
      if (sort_order !== undefined) updates.sort_order = sort_order;

      if (Object.keys(updates).length === 0) {
        return error("No fields to update");
      }

      const { data, error: dbError } = await supabase
        .from("carousel")
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
