"use client";

import { AnnouncementTable } from "@/components/announcement-table";
import { useAuth } from "@/components/auth-provider";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import type { Announcement } from "@/lib/supabase/types";
import { Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

export function AnnouncementPageClient({
  publishedAnnouncements,
}: {
  publishedAnnouncements: Announcement[];
}) {
  const router = useRouter();
  const { user, isAdmin } = useAuth();
  const supabaseRef = useRef(createClient());
  const [isCreating, setIsCreating] = useState(false);
  const [drafts, setDrafts] = useState<Announcement[]>([]);

  // Admin: fetch own drafts client-side (RLS filters non-admin to empty).
  useEffect(() => {
    if (!isAdmin) { setDrafts([]); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabaseRef.current
        .from("announcements")
        .select("*")
        .eq("status", "draft")
        .is("event_id", null)
        .order("date", { ascending: false });
      if (!cancelled) setDrafts((data as Announcement[] | null) ?? []);
    })();
    return () => { cancelled = true; };
  }, [isAdmin]);

  const announcements = useMemo(() => {
    if (!isAdmin || drafts.length === 0) return publishedAnnouncements;
    return [...drafts, ...publishedAnnouncements].sort(
      (a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0),
    );
  }, [drafts, isAdmin, publishedAnnouncements]);

  const handleCreate = async () => {
    if (!user?.id || !isAdmin) return;
    setIsCreating(true);
    const { data, error } = await supabaseRef.current
      .from("announcements")
      .insert({ title: "新公告", category: "一般", content: {}, status: "draft", author_id: user.id, event_id: null })
      .select()
      .single();
    if (error) { toast.error("建立失敗"); setIsCreating(false); return; }
    router.push(`/announcement/${data.id}/edit`);
  };

  return (
    <PageShell>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">最新公告</h1>
        {isAdmin && (
          <Button variant="secondary" onClick={handleCreate} disabled={isCreating}>
            {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            新增公告
          </Button>
        )}
      </div>

      {announcements.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">尚無公告</div>
      ) : (
        <AnnouncementTable
          announcements={announcements}
          showStatus={isAdmin}
          getHref={(item) => (isAdmin ? `/announcement/${item.id}/edit` : `/announcement/${item.id}`)}
        />
      )}
    </PageShell>
  );
}
