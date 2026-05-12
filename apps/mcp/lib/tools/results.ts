import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { markdownToTiptap } from "@/lib/markdown-to-tiptap";

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

function processContent(
  content: string,
  contentFormat: string
): Record<string, unknown> {
  if (contentFormat === "tiptap") {
    return JSON.parse(content);
  }
  return markdownToTiptap(content);
}

export function registerResultTools(
  server: McpServer,
  supabase: SupabaseClient,
  userId: string
) {
  // --- list_results ---
  server.tool(
    "list_results",
    {
      event_id: z.string().uuid().optional(),
      status: z.enum(["draft", "published"]).optional(),
      limit: z.number().int().positive().optional(),
      offset: z.number().int().nonnegative().optional(),
    },
    async ({ event_id, status, limit, offset }) => {
      let query = supabase
        .from("results")
        .select(
          "id, title, date, summary, status, author_id, event_id, pinned, header_image, created_at"
        )
        .order("date", { ascending: false })
        .range(offset ?? 0, (offset ?? 0) + (limit ?? 20) - 1);

      if (event_id) {
        query = query.eq("event_id", event_id);
      }

      if (status) {
        query = query.eq("status", status);
      }

      const { data, error: dbError } = await query;

      if (dbError) {
        return error(dbError.message);
      }

      return success(data);
    }
  );

  // --- get_result ---
  server.tool(
    "get_result",
    {
      id: z.string().uuid(),
    },
    async ({ id }) => {
      const { data, error: dbError } = await supabase
        .from("results")
        .select("*")
        .eq("id", id)
        .single();

      if (dbError) {
        return error(dbError.message);
      }

      return success(data);
    }
  );

  // --- create_result ---
  server.tool(
    "create_result",
    {
      title: z.string(),
      summary: z.string(),
      content: z.string(),
      content_format: z.enum(["markdown", "tiptap"]).optional(),
      date: z.string(),
      status: z.enum(["draft", "published"]).optional(),
      event_id: z.string().uuid().optional(),
      header_image: z.string().optional(),
    },
    async ({
      title,
      summary,
      content,
      content_format,
      date,
      status,
      event_id,
      header_image,
    }) => {
      let tiptapContent: Record<string, unknown>;
      try {
        tiptapContent = processContent(content, content_format ?? "markdown");
      } catch (e) {
        return error(
          `Failed to process content: ${e instanceof Error ? e.message : String(e)}`
        );
      }

      const { data, error: dbError } = await supabase
        .from("results")
        .insert({
          title,
          summary,
          content: tiptapContent,
          date,
          status: status ?? "draft",
          event_id: event_id ?? null,
          header_image: header_image ?? null,
          author_id: userId,
          pinned: false,
        })
        .select()
        .single();

      if (dbError) {
        return error(dbError.message);
      }

      return success(data);
    }
  );

  // --- update_result ---
  server.tool(
    "update_result",
    {
      id: z.string().uuid(),
      title: z.string().optional(),
      summary: z.string().optional(),
      content: z.string().optional(),
      content_format: z.enum(["markdown", "tiptap"]).optional(),
      date: z.string().optional(),
      status: z.enum(["draft", "published"]).optional(),
      header_image: z.string().optional(),
    },
    async ({
      id,
      title,
      summary,
      content,
      content_format,
      date,
      status,
      header_image,
    }) => {
      const updates: Record<string, unknown> = {};

      if (title !== undefined) updates.title = title;
      if (summary !== undefined) updates.summary = summary;
      if (date !== undefined) updates.date = date;
      if (status !== undefined) updates.status = status;
      if (header_image !== undefined) updates.header_image = header_image;

      if (content !== undefined) {
        try {
          updates.content = processContent(
            content,
            content_format ?? "markdown"
          );
        } catch (e) {
          return error(
            `Failed to process content: ${e instanceof Error ? e.message : String(e)}`
          );
        }
      }

      if (Object.keys(updates).length === 0) {
        return error("No fields to update");
      }

      const { data, error: dbError } = await supabase
        .from("results")
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
