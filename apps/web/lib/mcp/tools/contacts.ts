import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { insertRow, listRows, updateRow } from "@/lib/actions/rows";
import { revalidate } from "@/lib/mcp/revalidate";
import { answer, defined, success } from "@/lib/mcp/tools/common";

export function registerContactTools(server: McpServer) {
  server.tool("list_contacts", {}, async () =>
    success(await listRows("contacts", {}, [{ column: "sort_order" }])),
  );

  const fields = {
    name: z.string(),
    position: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().optional(),
    sort_order: z.number().int().optional(),
  };

  server.tool("create_contact", fields, async (args) => {
    const result = await insertRow("contacts", defined(args));
    if (result.ok) await revalidate("contacts");
    return answer(result);
  });

  server.tool("update_contact", { id: z.string().uuid(), ...fields, name: z.string().optional() }, async ({ id, ...args }) => {
    const result = await updateRow("contacts", id, defined(args));
    if (result.ok) await revalidate("contacts");
    return answer(result);
  });
}
