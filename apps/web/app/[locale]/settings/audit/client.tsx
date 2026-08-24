"use client";

import { useMemo, useState } from "react";

import { AppLink } from "@/components/shared/app-link";
import { PageShell } from "@/components/shared/page-shell";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate } from "@/lib/date";
import { useT } from "@/lib/i18n/locale-provider";
import type { AuditLogAction } from "@winlab/db";
import { ArrowLeft } from "lucide-react";

export type AuditLogRow = {
  id: string;
  table_name: string;
  row_id: string | null;
  action: AuditLogAction;
  actor: string | null;
  changed_fields: string[] | null;
  created_at: string;
};

const ALL = "__all__";

export default function SettingsAuditPageClient({
  initialEntries,
  actorNames,
}: {
  initialEntries: AuditLogRow[];
  actorNames: Record<string, string>;
}) {
  const t = useT();
  const [tableFilter, setTableFilter] = useState(ALL);
  const [actionFilter, setActionFilter] = useState(ALL);

  const tableNames = useMemo(
    () => Array.from(new Set(initialEntries.map((e) => e.table_name))).sort(),
    [initialEntries],
  );

  const actionLabel: Record<AuditLogAction, string> = {
    insert: t.admin.audit.action.insert,
    update: t.admin.audit.action.update,
    delete: t.admin.audit.action.delete,
  };

  const filtered = initialEntries.filter((entry) => {
    if (tableFilter !== ALL && entry.table_name !== tableFilter) return false;
    if (actionFilter !== ALL && entry.action !== actionFilter) return false;
    return true;
  });

  return (
    <PageShell className="block">
      <div className="flex items-center gap-4 mb-8">
        <AppLink
          href="/settings"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t.admin.settings.title}
        </AppLink>
      </div>

      <h1 className="text-3xl font-bold mb-6">{t.admin.audit.title}</h1>

      <div className="mb-4 flex flex-wrap gap-2">
        <Select value={tableFilter} onValueChange={setTableFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t.admin.audit.filter.allTables}</SelectItem>
            {tableNames.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t.admin.audit.filter.allActions}</SelectItem>
            <SelectItem value="insert">{actionLabel.insert}</SelectItem>
            <SelectItem value="update">{actionLabel.update}</SelectItem>
            <SelectItem value="delete">{actionLabel.delete}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">{t.admin.audit.empty}</div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium">{t.admin.audit.columns.time}</th>
                <th className="px-4 py-3 text-left font-medium">{t.admin.audit.columns.table}</th>
                <th className="px-4 py-3 text-left font-medium">{t.admin.audit.columns.action}</th>
                <th className="px-4 py-3 text-left font-medium">{t.admin.audit.columns.actor}</th>
                <th className="px-4 py-3 text-left font-medium">{t.admin.audit.columns.fields}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((entry) => (
                <tr key={entry.id}>
                  <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                    {formatDate(entry.created_at, "datetime")}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{entry.table_name}</td>
                  <td className="px-4 py-3">{actionLabel[entry.action]}</td>
                  <td className="px-4 py-3">
                    {entry.actor ? actorNames[entry.actor] ?? entry.actor : t.admin.audit.unknownActor}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {entry.changed_fields?.length ? entry.changed_fields.join(", ") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageShell>
  );
}
