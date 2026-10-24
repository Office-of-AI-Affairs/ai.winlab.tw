import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getRow, insertRow, listRows, updateRow } from "@/lib/actions/rows";
import type { Viewer } from "@/lib/auth/viewer";
import { revalidate } from "@/lib/mcp/revalidate";
import { answer, defined, error, page, success, tiptapOrError } from "@/lib/mcp/tools/common";

const LIST_COLUMNS = ["id", "title", "category", "date", "status", "event_id", "author_id", "created_at"];

export function registerAnnouncementTools(server: McpServer, viewer: Viewer) {
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
      const rows = await listRows(
        "announcements",
        defined({ event_id: event_id ?? null, status, category }),
        [{ column: "date", ascending: false }],
      );
      return success(page(rows, LIST_COLUMNS, limit, offset));
    },
  );

  server.tool("get_announcement", { id: z.string().uuid() }, async ({ id }) => answer(await getRow("announcements", id)));

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
    async ({ title, content, content_format, category, date, status, event_id }) => {
      const tiptap = tiptapOrError(content, content_format);
      if (!tiptap.ok) return error(tiptap.error);
      const result = await insertRow("announcements", {
        title,
        content: tiptap.value,
        category,
        date,
        status: status ?? "draft",
        event_id: event_id ?? null,
        author_id: viewer.id,
      });
      if (result.ok) await revalidate("announcements-published");
      return answer(result);
    },
  );

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
    async ({ id, content, content_format, ...rest }) => {
      const tiptap = tiptapOrError(content, content_format);
      if (!tiptap.ok) return error(tiptap.error);
      const updates = defined({ ...rest, content: tiptap.value });
      if (Object.keys(updates).length === 0) return error("No fields to update");
      const result = await updateRow("announcements", id, updates);
      if (result.ok) await revalidate("announcements-published");
      return answer(result);
    },
  );
}
