import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { insertRow, listRows, updateRow } from "@/lib/actions/rows";
import { revalidate } from "@/lib/mcp/revalidate";
import { answer, defined, success } from "@/lib/mcp/tools/common";

// The table is carousel_slides (the old tools asked for "carousel", which
// does not exist, so they always failed).
export function registerCarouselTools(server: McpServer) {
  server.tool("list_carousel", {}, async () =>
    success(await listRows("carousel_slides", {}, [{ column: "sort_order" }])),
  );

  const fields = {
    title: z.string(),
    description: z.string().optional(),
    link: z.string().optional(),
    image: z.string().optional(),
    sort_order: z.number().int().optional(),
  };

  server.tool("create_carousel_slide", fields, async (args) => {
    const result = await insertRow("carousel_slides", defined(args));
    if (result.ok) await revalidate("carousel-slides");
    return answer(result);
  });

  server.tool(
    "update_carousel_slide",
    { id: z.string().uuid(), ...fields, title: z.string().optional() },
    async ({ id, ...args }) => {
      const result = await updateRow("carousel_slides", id, defined(args));
      if (result.ok) await revalidate("carousel-slides");
      return answer(result);
    },
  );
}
