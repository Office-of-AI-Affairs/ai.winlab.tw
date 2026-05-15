import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { markdownToTiptap } from "@/lib/markdown-to-tiptap";
import { revalidate } from "@/lib/revalidate";

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
  contentFormat: string,
): Record<string, unknown> {
  if (contentFormat === "tiptap") {
    return JSON.parse(content);
  }
  return markdownToTiptap(content);
}

export function registerInsightTools(
  server: McpServer,
  supabase: SupabaseClient,
  userId: string,
) {
  // --- list_insights ---
  // RLS scoping: published rows are public; drafts visible to the author +
  // admin. Callers don't need to filter — Supabase enforces it.
  server.tool(
    "list_insights",
    {
      status: z.enum(["draft", "published"]).optional(),
      author_id: z.string().uuid().optional(),
      limit: z.number().int().positive().optional(),
      offset: z.number().int().nonnegative().optional(),
    },
    async ({ status, author_id, limit, offset }) => {
      let query = supabase
        .from("articles")
        .select(
          "id, title, summary, cover_image_url, status, published_at, author_id, created_at, updated_at",
        )
        .order("published_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .range(offset ?? 0, (offset ?? 0) + (limit ?? 20) - 1);

      if (status) {
        query = query.eq("status", status);
      }
      if (author_id) {
        query = query.eq("author_id", author_id);
      }

      const { data, error: dbError } = await query;

      if (dbError) {
        return error(dbError.message);
      }

      return success(data);
    },
  );

  // --- get_insight ---
  server.tool(
    "get_insight",
    {
      id: z.string().uuid(),
    },
    async ({ id }) => {
      const { data, error: dbError } = await supabase
        .from("articles")
        .select("*")
        .eq("id", id)
        .single();

      if (dbError) {
        return error(dbError.message);
      }

      return success(data);
    },
  );

  // --- create_insight ---
  // author_id is always the caller — admins who want to ghost-write should
  // use the web app's admin tools. RLS still gates: members can only insert
  // when author_id = self.
  server.tool(
    "create_insight",
    {
      title: z.string(),
      content: z.string(),
      content_format: z.enum(["markdown", "tiptap"]).optional(),
      summary: z.string().optional(),
      cover_image_url: z.string().url().optional(),
      status: z.enum(["draft", "published"]).optional(),
    },
    async ({ title, content, content_format, summary, cover_image_url, status }) => {
      let tiptapContent: Record<string, unknown>;
      try {
        tiptapContent = processContent(content, content_format ?? "markdown");
      } catch (e) {
        return error(
          `Failed to process content: ${e instanceof Error ? e.message : String(e)}`,
        );
      }

      const { data, error: dbError } = await supabase
        .from("articles")
        .insert({
          title,
          content: tiptapContent,
          summary: summary ?? null,
          cover_image_url: cover_image_url ?? null,
          status: status ?? "draft",
          author_id: userId,
        })
        .select()
        .single();

      if (dbError) {
        return error(dbError.message);
      }

      await revalidate("insights-published");
      return success(data);
    },
  );

  // --- update_insight ---
  server.tool(
    "update_insight",
    {
      id: z.string().uuid(),
      title: z.string().optional(),
      content: z.string().optional(),
      content_format: z.enum(["markdown", "tiptap"]).optional(),
      summary: z.string().optional(),
      cover_image_url: z.string().url().optional(),
      status: z.enum(["draft", "published"]).optional(),
    },
    async ({ id, title, content, content_format, summary, cover_image_url, status }) => {
      const updates: Record<string, unknown> = {};

      if (title !== undefined) updates.title = title;
      if (summary !== undefined) updates.summary = summary;
      if (cover_image_url !== undefined) updates.cover_image_url = cover_image_url;
      if (status !== undefined) updates.status = status;

      if (content !== undefined) {
        try {
          updates.content = processContent(
            content,
            content_format ?? "markdown",
          );
        } catch (e) {
          return error(
            `Failed to process content: ${e instanceof Error ? e.message : String(e)}`,
          );
        }
      }

      if (Object.keys(updates).length === 0) {
        return error("No fields to update");
      }

      const { data, error: dbError } = await supabase
        .from("articles")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (dbError) {
        return error(dbError.message);
      }

      await revalidate("insights-published");
      return success(data);
    },
  );

  // --- delete_insight ---
  // RLS only lets the author or an admin through.
  server.tool(
    "delete_insight",
    {
      id: z.string().uuid(),
    },
    async ({ id }) => {
      const { error: dbError } = await supabase
        .from("articles")
        .delete()
        .eq("id", id);

      if (dbError) {
        return error(dbError.message);
      }

      await revalidate("insights-published");
      return success({ id });
    },
  );
}
