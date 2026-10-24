import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { deleteRow, getRow, insertRow, listRows, updateRow } from "@/lib/actions/rows";
import type { Viewer } from "@/lib/auth/viewer";
import { revalidate } from "@/lib/mcp/revalidate";
import { answer, defined, error, page, success, tiptapOrError } from "@/lib/mcp/tools/common";

const LIST_COLUMNS = [
  "id", "title", "summary", "cover_image_url", "status", "published_at", "author_id", "created_at", "updated_at",
];

export function registerInsightTools(server: McpServer, viewer: Viewer) {
  server.tool(
    "list_insights",
    {
      status: z.enum(["draft", "published"]).optional(),
      author_id: z.string().uuid().optional(),
      limit: z.number().int().positive().optional(),
      offset: z.number().int().nonnegative().optional(),
    },
    async ({ status, author_id, limit, offset }) => {
      const rows = await listRows("articles", defined({ status, author_id }), [{ column: "created_at", ascending: false }]);
      // Newest publication first; unpublished rows after, by creation.
      rows.sort((a, b) => String(b.published_at ?? "").localeCompare(String(a.published_at ?? "")));
      return success(page(rows, LIST_COLUMNS, limit, offset));
    },
  );

  server.tool("get_insight", { id: z.string().uuid() }, async ({ id }) => answer(await getRow("articles", id)));

  // author_id is always the caller; admins who ghost-write use the web app.
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
    async ({ content, content_format, status, ...rest }) => {
      const tiptap = tiptapOrError(content, content_format);
      if (!tiptap.ok) return error(tiptap.error);
      const result = await insertRow("articles", {
        ...defined(rest),
        content: tiptap.value,
        status: status ?? "draft",
        author_id: viewer.id,
      });
      if (result.ok) await revalidate("insights-published");
      return answer(result);
    },
  );

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
    async ({ id, content, content_format, ...rest }) => {
      const tiptap = tiptapOrError(content, content_format);
      if (!tiptap.ok) return error(tiptap.error);
      const updates = defined({ ...rest, content: tiptap.value });
      if (Object.keys(updates).length === 0) return error("No fields to update");
      const result = await updateRow("articles", id, updates);
      if (result.ok) await revalidate("insights-published");
      return answer(result);
    },
  );

  server.tool("delete_insight", { id: z.string().uuid() }, async ({ id }) => {
    const result = await deleteRow("articles", id);
    if (result.ok) await revalidate("insights-published");
    return answer(result);
  });
}
