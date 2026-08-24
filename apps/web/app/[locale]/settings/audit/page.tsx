import SettingsAuditPageClient, { type AuditLogRow } from "./client";
import { requireAdminServer } from "@/lib/supabase/require-admin-server";

// Read-only, admin-gated (#47). RLS also restricts `audit_log` SELECT to
// admin — `requireAdminServer()` is belt-and-suspenders at the route level,
// same posture as /settings/users.
export default async function SettingsAuditPage() {
  const { supabase } = await requireAdminServer();

  const { data: entries } = await supabase
    .from("audit_log")
    .select("id, table_name, row_id, action, actor, changed_fields, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  const rows = (entries as AuditLogRow[] | null) ?? [];

  const actorIds = Array.from(
    new Set(rows.map((r) => r.actor).filter((id): id is string => Boolean(id))),
  );
  let actorNames: Record<string, string> = {};
  if (actorIds.length) {
    const { data: profiles } = await supabase
      .from("public_profiles")
      .select("id, display_name")
      .in("id", actorIds);
    actorNames = Object.fromEntries(
      (profiles ?? []).map((p) => [p.id, p.display_name ?? p.id]),
    );
  }

  return <SettingsAuditPageClient initialEntries={rows} actorNames={actorNames} />;
}
