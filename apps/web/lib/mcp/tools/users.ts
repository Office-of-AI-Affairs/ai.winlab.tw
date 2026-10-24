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

const roleSchema = z.enum(["admin", "user", "vendor", "member"]);

export function registerUserTools(server: McpServer, supabase: SupabaseClient) {
  // --- list_users (admin only) ---
  // Mirrors /settings/users — returns email + display_name + role + tags via
  // the `get_all_users` RPC. RLS rejects non-admin callers at the RPC layer.
  server.tool("list_users", {}, async () => {
    const { data, error: dbError } = await supabase.rpc("get_all_users");

    if (dbError) {
      return error(dbError.message);
    }

    return success(data ?? []);
  });

  // --- create_user (admin only) ---
  // Creates an auth user + profile row. The new account has no password —
  // the recipient must use "forgot password" to set one.
  server.tool(
    "create_user",
    {
      email: z.string(),
      name: z.string().optional(),
      role: roleSchema.optional(),
    },
    async ({ email, name, role }) => {
      const { data, error: dbError } = await supabase.rpc("admin_create_user", {
        p_email: email,
        p_name: name,
        p_role: role,
      });

      if (dbError) {
        return error(dbError.message);
      }

      // Report what the database actually persisted instead of echoing the
      // inputs — echoing once masked admin_create_user dropping p_name/p_role.
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, display_name, role")
        .eq("id", data as string)
        .single();

      if (profileError) {
        return error(profileError.message);
      }

      return success({ ...profile, email });
    }
  );

  // --- delete_user (admin only) ---
  server.tool(
    "delete_user",
    {
      user_id: z.string().uuid(),
    },
    async ({ user_id }) => {
      const { error: dbError } = await supabase.rpc("admin_delete_user", {
        p_user_id: user_id,
      });

      if (dbError) {
        return error(dbError.message);
      }

      return success({ id: user_id });
    }
  );

  // --- update_user_role (admin only) ---
  server.tool(
    "update_user_role",
    {
      user_id: z.string().uuid(),
      role: roleSchema,
    },
    async ({ user_id, role }) => {
      const { data, error: dbError } = await supabase
        .from("profiles")
        .update({ role })
        .eq("id", user_id)
        .select("id, role")
        .single();

      if (dbError) {
        return error(dbError.message);
      }

      return success(data);
    }
  );

  // --- update_user_display_name (admin only) ---
  // Covers vendor renames and accounts created before admin_create_user
  // persisted p_name. Writes profiles only — public_profiles is a
  // trigger-maintained projection with no client write policy, so writing
  // it directly is at best a silent no-op.
  server.tool(
    "update_user_display_name",
    {
      user_id: z.string().uuid(),
      display_name: z.string(),
    },
    async ({ user_id, display_name }) => {
      const { data, error: dbError } = await supabase
        .from("profiles")
        .update({ display_name })
        .eq("id", user_id)
        .select("id, display_name")
        .single();

      if (dbError) {
        return error(dbError.message);
      }

      return success(data);
    }
  );

  // --- update_user_tags (admin only) ---
  // Replaces the whole tags array. Pass [] to clear.
  server.tool(
    "update_user_tags",
    {
      user_id: z.string().uuid(),
      tags: z.array(z.string()),
    },
    async ({ user_id, tags }) => {
      const { data, error: dbError } = await supabase
        .from("profiles")
        .update({ tags })
        .eq("id", user_id)
        .select("id, tags")
        .single();

      if (dbError) {
        return error(dbError.message);
      }

      return success(data);
    }
  );
}
