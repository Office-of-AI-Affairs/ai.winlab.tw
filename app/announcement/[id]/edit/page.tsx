"use client";

import { AnnouncementDetail } from "@/components/announcement-detail";
import { useAuth } from "@/components/auth-provider";
import { TiptapEditor } from "@/components/tiptap-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import type { Announcement } from "@/lib/supabase/types";
import TiptapImage from "@tiptap/extension-image";
import { generateHTML } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";
import Youtube from "@tiptap/extension-youtube";
import { ArrowLeft, Check, Eye, EyeOff, Loader2, Save, Send, Trash2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

export default function AnnouncementEditPage() {
  const { user, isLoading: authLoading, isAdmin } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const supabase = createClient();

  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [savedAnnouncement, setSavedAnnouncement] = useState<Announcement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPreview, setIsPreview] = useState(false);

  const hasChanges = announcement && savedAnnouncement
    ? announcement.title !== savedAnnouncement.title ||
    announcement.category !== savedAnnouncement.category ||
    announcement.date !== savedAnnouncement.date ||
    JSON.stringify(announcement.content) !== JSON.stringify(savedAnnouncement.content)
    : false;

  const fetchAnnouncement = useCallback(async () => {
    const { data, error } = await supabase
      .from("announcements")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching announcement:", error);
      router.push("/announcement");
      return;
    }

    setAnnouncement(data);
    setSavedAnnouncement(data);
    setIsLoading(false);
  }, [supabase, id, router]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }
    if (!authLoading && user && !isAdmin) {
      router.push(`/announcement/${id}`);
      return;
    }
    if (user && isAdmin) {
      fetchAnnouncement();
    }
  }, [user, isAdmin, authLoading, fetchAnnouncement, router, id]);

  const previewContentHtml = useMemo(
    () =>
      announcement?.content && Object.keys(announcement.content).length > 0
        ? generateHTML(announcement.content, [
            StarterKit,
            TiptapImage.configure({ HTMLAttributes: { class: "rounded-lg max-w-full h-auto" } }),
            Youtube,
          ])
        : "<p>（無內容）</p>",
    [announcement?.content]
  );

  const handleSave = async () => {
    if (!announcement) return;

    setIsSaving(true);
    const { error } = await supabase
      .from("announcements")
      .update({
        title: announcement.title,
        category: announcement.category,
        date: announcement.date,
        content: announcement.content,
      })
      .eq("id", id);

    if (error) {
      console.error("Error saving announcement:", error);
    } else {
      setSavedAnnouncement({ ...announcement });
    }
    setIsSaving(false);
  };

  const handlePublish = async () => {
    if (!announcement) return;

    setIsPublishing(true);
    const newStatus: "draft" | "published" =
      announcement.status === "published" ? "draft" : "published";

    const { error } = await supabase
      .from("announcements")
      .update({
        title: announcement.title,
        category: announcement.category,
        date: announcement.date,
        content: announcement.content,
        status: newStatus,
      })
      .eq("id", id);

    if (error) {
      console.error("Error publishing announcement:", error);
    } else {
      const updated: Announcement = { ...announcement, status: newStatus };
      setAnnouncement(updated);
      setSavedAnnouncement(updated);
    }
    setIsPublishing(false);
  };

  const handleDelete = async () => {
    if (!confirm("確定要刪除這則公告嗎？")) return;

    setIsDeleting(true);
    const { error } = await supabase
      .from("announcements")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting announcement:", error);
      setIsDeleting(false);
      return;
    }

    router.push("/announcement");
  };

  if (isLoading || authLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12 flex justify-center items-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!announcement) {
    return null;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 flex flex-col mt-8 pb-16">

      <div className="sticky top-16 z-20 bg-background/80 backdrop-blur-sm py-4 -mx-4 px-4 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push("/announcement")}>
            <ArrowLeft className="w-4 h-4" />
            返回列表
          </Button>
          <div className="flex gap-2">
            <Button variant={isPreview ? "secondary" : "ghost"} size="sm" onClick={() => setIsPreview(v => !v)}>
              {isPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {isPreview ? "編輯" : "預覽"}
            </Button>
            <Button
              variant={hasChanges ? "outline" : "ghost"}
              onClick={handleSave}
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
              onClick={handlePublish}
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
              onClick={handleDelete}
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

        {!isPreview && <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1">
            <Label htmlFor="date" className="text-sm mx-2">公告日期</Label>
            <Input
              id="date"
              type="date"
              value={announcement.date}
              onChange={(e) =>
                setAnnouncement({ ...announcement, date: e.target.value })
              }
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="category" className="text-sm mx-2">類別</Label>
            <Input
              id="category"
              value={announcement.category}
              onChange={(e) =>
                setAnnouncement({ ...announcement, category: e.target.value })
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
                setAnnouncement({ ...announcement, title: e.target.value })
              }
              placeholder="請輸入公告標題"
            />
          </div>
        </div>}
      </div>

      {isPreview ? (
        <div className="py-12">
          <AnnouncementDetail
            title={announcement.title}
            date={announcement.date}
            category={announcement.category}
            contentHtml={previewContentHtml}
          />
        </div>
      ) : (
        <TiptapEditor
          content={announcement.content}
          onChange={(content) => setAnnouncement({ ...announcement, content })}
        />
      )}
    </div>
  );
}