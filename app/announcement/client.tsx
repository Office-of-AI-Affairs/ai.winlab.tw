"use client";

import { AnnouncementTable } from "@/components/announcement-table";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import type { Announcement } from "@/lib/supabase/types";
import { Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function AnnouncementPageClient({
  announcements,
  isAdmin,
  userId,
}: {
  announcements: Announcement[];
  isAdmin: boolean;
  userId: string | null;
}) {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!userId || !isAdmin) return;
    setIsCreating(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("announcements")
      .insert({ title: "新公告", category: "一般", content: {}, status: "draft", author_id: userId, event_id: null })
      .select()
      .single();
    if (error) { setIsCreating(false); return; }
    router.push(`/announcement/${data.id}/edit`);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 flex flex-col gap-8">
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
        <div className="text-center py-12 text-muted-foreground">目前沒有公告</div>
      ) : (
        <AnnouncementTable
          announcements={announcements}
          showStatus={isAdmin}
          onRowClick={(item) =>
            router.push(isAdmin ? `/announcement/${item.id}/edit` : `/announcement/${item.id}`)
          }
        />
      )}
    </div>
  );
}
