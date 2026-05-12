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

export function registerAnnouncementTools(
  server: McpServer,
  supabase: SupabaseClient,
  userId: string
) {
  // --- list_announcements ---
  server.tool(
    "list_announcements",
    {
      event_id: z.string().uuid().optional(),
      status: z.enum(["draft", "published"]).optional(),
      category: z.string().optional(),
      limit: z.number().int().positive().optional(),
      offset: z.number().int().nonnegative().optional(),
    },
    async ({ event_id, status, category, limit, offset }) => {
      let query = supabase
        .from("announcements")
        .select(
          "id, title, category, date, status, event_id, author_id, created_at"
        )
        .order("date", { ascending: false })
        .range(offset ?? 0, (offset ?? 0) + (limit ?? 20) - 1);

      if (event_id) {
        query = query.eq("event_id", event_id);
      } else {
        query = query.is("event_id", null);
      }

      if (status) {
        query = query.eq("status", status);
      }

      if (category) {
        query = query.eq("category", category);
      }

      const { data, error: dbError } = await query;

      if (dbError) {
        return error(dbError.message);
      }

      return success(data);
    }
  );

  // --- get_announcement ---
  server.tool(
    "get_announcement",
    {
      id: z.string().uuid(),
    },
    async ({ id }) => {
      const { data, error: dbError } = await supabase
        .from("announcements")
        .select("*")
        .eq("id", id)
        .single();

      if (dbError) {
        return error(dbError.message);
      }

      return success(data);
    }
  );

  // --- create_announcement ---
  server.tool(
    "create_announcement",
    {
      title: z.string(),
      content: z.string(),
      content_format: z.enum(["markdown", "tiptap"]).optional(),
      category: z.string(),
      date: z.string(),
      status: z.enum(["draft", "published"]).optional(),
      event_id: z.string().uuid().optional(),
    },
    async ({
      title,
      content,
      content_format,
      category,
      date,
      status,
      event_id,
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
        .from("announcements")
        .insert({
          title,
          content: tiptapContent,
          category,
          date,
          status: status ?? "draft",
          event_id: event_id ?? null,
          author_id: userId,
        })
        .select()
        .single();

      if (dbError) {
        return error(dbError.message);
      }

      return success(data);
    }
  );

  // --- update_announcement ---
  server.tool(
    "update_announcement",
    {
      id: z.string().uuid(),
      title: z.string().optional(),
      content: z.string().optional(),
      content_format: z.enum(["markdown", "tiptap"]).optional(),
      category: z.string().optional(),
      date: z.string().optional(),
      status: z.enum(["draft", "published"]).optional(),
      event_id: z.string().uuid().optional(),
    },
    async ({ id, title, content, content_format, category, date, status, event_id }) => {
      const updates: Record<string, unknown> = {};

      if (title !== undefined) updates.title = title;
      if (category !== undefined) updates.category = category;
      if (date !== undefined) updates.date = date;
      if (status !== undefined) updates.status = status;
      if (event_id !== undefined) updates.event_id = event_id;

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
        .from("announcements")
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
