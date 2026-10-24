import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { listRows, updateRow } from "@/lib/actions/rows";
import { revalidate } from "@/lib/mcp/revalidate";
import { answer, defined, error, processContent, success } from "@/lib/mcp/tools/common";

// The table is introduction (the old tools asked for "introductions",
// which does not exist, so they always failed).
export function registerIntroductionTools(server: McpServer) {
  server.tool("get_introduction", {}, async () => {
    const [row] = await listRows("introduction", {}, [{ column: "created_at" }]);
    return row ? success(row) : error("Not found");
  });

  server.tool(
    "update_introduction",
    {
      title: z.string().optional(),
      content: z.string().optional(),
      content_format: z.enum(["markdown", "tiptap"]).optional(),
    },
    async ({ title, content, content_format }) => {
      const [existing] = await listRows("introduction", {}, [{ column: "created_at" }]);
      if (!existing) return error("Not found");
      let tiptap: Record<string, unknown> | undefined;
      try {
        tiptap = content === undefined ? undefined : processContent(content, content_format);
      } catch (e) {
        return error(`Failed to process content: ${e instanceof Error ? e.message : String(e)}`);
      }
      const updates = defined({ title, content: tiptap });
      if (Object.keys(updates).length === 0) return error("No fields to update");
      const result = await updateRow("introduction", String(existing.id), updates);
      if (result.ok) await revalidate("introduction");
      return answer(result);
    },
  );
}
