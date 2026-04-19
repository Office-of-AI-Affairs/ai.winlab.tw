"use client";

import { revalidateAnnouncements } from "@/app/announcement/actions";
import { PageShell } from "@/components/page-shell";
import { TiptapEditor } from "@/components/tiptap-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useContentEditor } from "@/hooks/use-content-editor";
import type { Announcement } from "@/lib/supabase/types";
import { ArrowLeft, Check, Loader2, Save, Send, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

export function AnnouncementEditClient({
  id,
  initialAnnouncement,
}: {
  id: string;
  initialAnnouncement: Announcement;
}) {
  const router = useRouter();

  const {
    data: announcement,
    setData: setAnnouncement,
    hasChanges,
    isSaving,
    isPublishing,
    isDeleting,
    save,
    publish,
    remove,
    guardNavigation,
  } = useContentEditor({
    table: "announcements",
    id,
    initialData: initialAnnouncement,
    fields: ["title", "category", "date", "content"],
    redirectTo: "/announcement",
    onAfterSave: revalidateAnnouncements,
    onAfterPublish: revalidateAnnouncements,
    onAfterRemove: revalidateAnnouncements,
  });

  return (
    <PageShell tone="editor">

      <div className="sticky top-16 z-20 bg-background/80 backdrop-blur-sm py-4 -mx-4 px-4 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <Button variant="ghost" size="sm" onClick={() => guardNavigation(() => router.push("/announcement"))}>
            <ArrowLeft className="w-4 h-4" />
            返回列表
          </Button>
          <div className="flex gap-2">
            <Button
              variant={hasChanges ? "outline" : "ghost"}
              onClick={save}
              disabled={isSaving || !hasChanges}
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : hasChanges ? (
                <Save className="w-4 h-4" />
              ) : (
                <Check className="w-4 h-4 text-green-600" />
              )}
              {hasChanges ? "儲存" : "已儲存"}
            </Button>
            <Button
              variant={announcement.status === "published" ? "secondary" : "default"}
              onClick={publish}
              disabled={isPublishing}
            >
              {isPublishing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {announcement.status === "published" ? "取消發布" : "發布"}
            </Button>
            <Button
              variant="destructive"
              onClick={remove}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              刪除
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1">
            <Label htmlFor="date" className="text-sm mx-2">公告日期</Label>
            <Input
              id="date"
              type="date"
              value={announcement.date}
              onChange={(e) =>
                setAnnouncement((prev) => ({ ...prev, date: e.target.value }))
              }
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="category" className="text-sm mx-2">類別</Label>
            <Input
              id="category"
              value={announcement.category}
              onChange={(e) =>
                setAnnouncement((prev) => ({ ...prev, category: e.target.value }))
              }
              placeholder="請輸入類別"
            />
          </div>
          <div className="flex flex-col gap-1 md:col-span-1">
            <Label htmlFor="title" className="text-sm mx-2">標題</Label>
            <Input
              id="title"
              value={announcement.title}
              onChange={(e) =>
                setAnnouncement((prev) => ({ ...prev, title: e.target.value }))
              }
              placeholder="請輸入公告標題"
            />
          </div>
        </div>
      </div>

      <TiptapEditor
        content={announcement.content}
        onChange={(content) => setAnnouncement((prev) => ({ ...prev, content }))}
      />
    </PageShell>
  );
}
