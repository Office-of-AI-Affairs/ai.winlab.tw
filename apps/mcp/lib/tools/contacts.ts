import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

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

export function registerContactTools(
  server: McpServer,
  supabase: SupabaseClient
) {
  // --- list_contacts ---
  server.tool("list_contacts", {}, async () => {
    const { data, error: dbError } = await supabase
      .from("contacts")
      .select("*")
      .order("sort_order", { ascending: true });

    if (dbError) {
      return error(dbError.message);
    }

    return success(data);
  });

  // --- create_contact ---
  server.tool(
    "create_contact",
    {
      name: z.string(),
      position: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
      sort_order: z.number().int().optional(),
    },
    async ({ name, position, phone, email, sort_order }) => {
      const row: Record<string, unknown> = { name };

      if (position !== undefined) row.position = position;
      if (phone !== undefined) row.phone = phone;
      if (email !== undefined) row.email = email;
      if (sort_order !== undefined) row.sort_order = sort_order;

      const { data, error: dbError } = await supabase
        .from("contacts")
        .insert(row)
        .select()
        .single();

      if (dbError) {
        return error(dbError.message);
      }

      return success(data);
    }
  );

  // --- update_contact ---
  server.tool(
    "update_contact",
    {
      id: z.string().uuid(),
      name: z.string().optional(),
      position: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
      sort_order: z.number().int().optional(),
    },
    async ({ id, name, position, phone, email, sort_order }) => {
      const updates: Record<string, unknown> = {};

      if (name !== undefined) updates.name = name;
      if (position !== undefined) updates.position = position;
      if (phone !== undefined) updates.phone = phone;
      if (email !== undefined) updates.email = email;
      if (sort_order !== undefined) updates.sort_order = sort_order;

      if (Object.keys(updates).length === 0) {
        return error("No fields to update");
      }

      const { data, error: dbError } = await supabase
        .from("contacts")
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
