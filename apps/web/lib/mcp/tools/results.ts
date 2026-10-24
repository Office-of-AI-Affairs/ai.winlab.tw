import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getRow, insertRow, listRows, updateRow } from "@/lib/actions/rows";
import type { Viewer } from "@/lib/auth/viewer";
import { answer, defined, error, page, success, tiptapOrError } from "@/lib/mcp/tools/common";

const LIST_COLUMNS = [
  "id", "title", "date", "summary", "status", "author_id", "event_id", "pinned", "header_image", "created_at",
];

export function registerResultTools(server: McpServer, viewer: Viewer) {
  server.tool(
    "list_results",
    {
      event_id: z.string().uuid().optional(),
      status: z.enum(["draft", "published"]).optional(),
      limit: z.number().int().positive().optional(),
      offset: z.number().int().nonnegative().optional(),
    },
    async ({ event_id, status, limit, offset }) => {
      const rows = await listRows("results", defined({ event_id, status }), [{ column: "date", ascending: false }]);
      return success(page(rows, LIST_COLUMNS, limit, offset));
    },
  );

  server.tool("get_result", { id: z.string().uuid() }, async ({ id }) => answer(await getRow("results", id)));

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
    async ({ content, content_format, status, event_id, ...rest }) => {
      const tiptap = tiptapOrError(content, content_format);
      if (!tiptap.ok) return error(tiptap.error);
      return answer(
        await insertRow("results", {
          ...defined(rest),
          content: tiptap.value,
          status: status ?? "draft",
          event_id: event_id ?? null,
          author_id: viewer.id,
          pinned: false,
        }),
      );
    },
  );

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
    async ({ id, content, content_format, ...rest }) => {
      const tiptap = tiptapOrError(content, content_format);
      if (!tiptap.ok) return error(tiptap.error);
      const updates = defined({ ...rest, content: tiptap.value });
      if (Object.keys(updates).length === 0) return error("No fields to update");
      return answer(await updateRow("results", id, updates));
    },
  );
}
