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

export function registerIntroductionTools(
  server: McpServer,
  supabase: SupabaseClient
) {
  // --- get_introduction ---
  server.tool("get_introduction", {}, async () => {
    const { data, error: dbError } = await supabase
      .from("introductions")
      .select("*")
      .limit(1)
      .single();

    if (dbError) {
      return error(dbError.message);
    }

    return success(data);
  });

  // --- update_introduction ---
  server.tool(
    "update_introduction",
    {
      title: z.string().optional(),
      content: z.string().optional(),
      content_format: z.enum(["markdown", "tiptap"]).optional(),
    },
    async ({ title, content, content_format }) => {
      // Get the first record's ID
      const { data: existing, error: fetchError } = await supabase
        .from("introductions")
        .select("id")
        .limit(1)
        .single();

      if (fetchError) {
        return error(fetchError.message);
      }

      const updates: Record<string, unknown> = {};

      if (title !== undefined) updates.title = title;

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
        .from("introductions")
        .update(updates)
        .eq("id", existing.id)
        .select()
        .single();

      if (dbError) {
        return error(dbError.message);
      }

      return success(data);
    }
  );
}
