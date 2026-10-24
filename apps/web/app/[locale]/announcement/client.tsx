"use client";

import { AnnouncementTable } from "@/components/announcement/announcement-table";
import { useAuth } from "@/components/layout/auth-provider";
import { PageShell } from "@/components/shared/page-shell";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/locale-provider";
import { insertRow, listRows } from "@/lib/actions/rows";
import type { Announcement } from "@winlab/db";
import { Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

export function AnnouncementPageClient({
  publishedAnnouncements,
}: {
  publishedAnnouncements: Announcement[];
}) {
  const t = useT();
  const router = useRouter();
  const { user, isAdmin, isEditor } = useAuth();
  const canManage = isAdmin || isEditor;
  const [isCreating, setIsCreating] = useState(false);
  const [drafts, setDrafts] = useState<Announcement[]>([]);

  // Admin/editor: fetch drafts client-side (the server returns none to
  // anyone else — see lib/permissions/rows.ts). No reset on
  // !canManage — useMemo below returns published-only when canManage flips
  // false, so any stale drafts in state are inert.
  useEffect(() => {
    if (!canManage) return;
    let cancelled = false;
    (async () => {
      const rows = await listRows(
        "announcements",
        { status: "draft", event_id: null },
        [{ column: "date", ascending: false }],
      );
      if (!cancelled) setDrafts(rows as Announcement[]);
    })();
    return () => { cancelled = true; };
  }, [canManage]);

  const announcements = useMemo(() => {
    if (!canManage || drafts.length === 0) return publishedAnnouncements;
    return [...drafts, ...publishedAnnouncements].sort(
      (a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0),
    );
  }, [drafts, canManage, publishedAnnouncements]);

  const handleCreate = async () => {
    if (!user?.id || !canManage) return;
    setIsCreating(true);
    // No slug: the announcements_set_slug trigger derives a unique one.
    const result = await insertRow("announcements", { title: t.announcement.newTitle, category: t.announcement.defaultCategory, content: {}, status: "draft", author_id: user.id, event_id: null }).catch(() => null);
    if (!result?.ok) { toast.error(t.common.createFailed); setIsCreating(false); return; }
    router.push(`/announcement/${encodeURIComponent(String(result.row.slug))}?mode=edit`);
  };

  return (
    <PageShell>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">{t.announcement.heading}</h1>
        {canManage && (
          <Button variant="secondary" onClick={handleCreate} disabled={isCreating}>
            {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {t.announcement.create}
          </Button>
        )}
      </div>

      {announcements.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">{t.announcement.empty}</div>
      ) : (
        <AnnouncementTable
          announcements={announcements}
          showStatus={canManage}
          getHref={(item) => {
            const slug = encodeURIComponent(item.slug || item.id);
            return canManage
              ? `/announcement/${slug}${item.status === "draft" ? "?mode=edit" : ""}`
              : `/announcement/${slug}`;
          }}
        />
      )}
    </PageShell>
  );
}
