import SettingsAuditPageClient, { type AuditLogRow } from "./client";
import { requireAdmin } from "@/lib/auth/viewer";
import { db } from "@/lib/db";
import { audit_log, public_profiles } from "@/lib/db/schema";
import { desc, inArray } from "drizzle-orm";

// Read-only, admin-gated (#47).
export default async function SettingsAuditPage() {
  await requireAdmin();

  // audit_log_action_check limits action to insert, update and delete.
  const rows = (await db
    .select({
      id: audit_log.id,
      table_name: audit_log.table_name,
      row_id: audit_log.row_id,
      action: audit_log.action,
      actor: audit_log.actor,
      changed_fields: audit_log.changed_fields,
      created_at: audit_log.created_at,
    })
    .from(audit_log)
    .orderBy(desc(audit_log.created_at))
    .limit(200)) as AuditLogRow[];

  const actorIds = Array.from(
    new Set(rows.map((r) => r.actor).filter((id): id is string => Boolean(id))),
  );
  let actorNames: Record<string, string> = {};
  if (actorIds.length) {
    const profiles = await db
      .select({ id: public_profiles.id, display_name: public_profiles.display_name })
      .from(public_profiles)
      .where(inArray(public_profiles.id, actorIds));
    actorNames = Object.fromEntries(profiles.map((p) => [p.id, p.display_name ?? p.id]));
  }

  return <SettingsAuditPageClient initialEntries={rows} actorNames={actorNames} />;
}
