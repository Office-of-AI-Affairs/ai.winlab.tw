import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { createUser, deleteUser, listUsers, setUserRole, setUserTags } from "@/lib/actions/users";
import { actor } from "@/lib/auth/viewer";
import { asUser, db } from "@/lib/db";
import { profiles, user as users } from "@/lib/db/schema";
import { answer, error, success } from "@/lib/mcp/tools/common";

const ROLES = ["admin", "user", "vendor", "member", "editor"] as const;

/** Admin-only actions throw Forbidden for anyone else; answer it as an error. */
async function asAdmin<T>(fn: () => Promise<T>) {
  try {
    return await fn();
  } catch {
    return null;
  }
}

export function registerUserTools(server: McpServer) {
  server.tool("list_users", {}, async () => {
    const rows = await asAdmin(() => listUsers());
    return rows ? success(rows) : error("Forbidden: admin only");
  });

  server.tool(
    "create_user",
    { email: z.string(), name: z.string().optional(), role: z.enum(ROLES).optional() },
    async ({ email, name, role }) => {
      const result = await asAdmin(() => createUser({ email, name: name ?? "", role: role ?? "user" }));
      if (!result) return error("Forbidden: admin only");
      if (!result.ok) return error(result.error);
      const [row] = await db
        .select({ id: profiles.id, display_name: profiles.display_name, role: profiles.role })
        .from(profiles)
        .innerJoin(users, eq(users.id, profiles.id))
        .where(eq(users.email, email.trim().toLowerCase()))
        .limit(1);
      return success(row ?? null);
    },
  );

  server.tool("delete_user", { user_id: z.string().uuid() }, async ({ user_id }) => {
    const result = await asAdmin(() => deleteUser(user_id));
    return result ? answer(result) : error("Forbidden: admin only");
  });

  server.tool("update_user_role", { user_id: z.string().uuid(), role: z.enum(ROLES) }, async ({ user_id, role }) => {
    const result = await asAdmin(() => setUserRole(user_id, role));
    if (!result) return error("Forbidden: admin only");
    return result.ok ? success({ id: user_id, role }) : error(result.error);
  });

  server.tool(
    "update_user_display_name",
    { user_id: z.string().uuid(), display_name: z.string() },
    async ({ user_id, display_name }) => {
      const result = await asAdmin(async () => {
        const viewer = await actor("admin");
        const name = display_name.trim().slice(0, 100);
        const updated = await asUser(viewer.id, (tx) =>
          tx.update(profiles).set({ display_name: name || null }).where(eq(profiles.id, user_id)).returning({
            id: profiles.id,
            display_name: profiles.display_name,
          }),
        );
        return updated[0] ?? null;
      });
      return result ? success(result) : error("Forbidden or not found");
    },
  );

  server.tool(
    "update_user_tags",
    { user_id: z.string().uuid(), tags: z.array(z.string()) },
    async ({ user_id, tags }) => {
      const result = await asAdmin(() => setUserTags(user_id, tags));
      if (!result) return error("Forbidden: admin only");
      return result.ok ? success({ id: user_id, tags }) : error(result.error);
    },
  );
}
