"use client";

import { useAuth } from "@/components/auth-provider";
import { ResultDetail, type PublisherInfo } from "@/components/result-detail";
import { TiptapEditor } from "@/components/tiptap-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import type { Result, Tag } from "@/lib/supabase/types";
import { uploadResultImage } from "@/lib/upload-image";
import { isExternalImage } from "@/lib/utils";
import { toast } from "sonner";
import {
  ArrowLeft,
  Check,
  Eye,
  EyeOff,
  ImagePlus,
  Loader2,
  Save,
  Send,
  Tag as TagIcon,
  Trash2,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type TagWithChildren = Tag & { children: Tag[] };

export default function ResultEditPage() {
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const supabase = createClient();

  const [result, setResult] = useState<Result | null>(null);
  const [savedResult, setSavedResult] = useState<Result | null>(null);
  const [canEdit, setCanEdit] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [publisherInfo, setPublisherInfo] = useState<PublisherInfo>(null);

  // Tags
  const [tagGroups, setTagGroups] = useState<TagWithChildren[]>([]);
  const [assignedTagIds, setAssignedTagIds] = useState<Set<string>>(new Set());
  const [isSavingTags, setIsSavingTags] = useState(false);

  const hasChanges =
    result && savedResult
      ? result.title !== savedResult.title ||
        result.date !== savedResult.date ||
        result.summary !== savedResult.summary ||
        (result.header_image ?? "") !== (savedResult.header_image ?? "") ||
        JSON.stringify(result.content) !== JSON.stringify(savedResult.content)
      : false;

  const fetchResult = useCallback(async () => {
    const { data, error } = await supabase.from("results").select("*").eq("id", id).single();
    if (error) { router.push(user ? `/profile/${user.id}` : "/"); return; }

    const r = { ...data, type: (data as Result).type ?? "personal", team_id: (data as Result).team_id ?? null } as Result;
    setResult(r);
    setSavedResult(r);

    // Fetch publisher info
    if (r.type === "team" && r.team_id) {
      const { data: teamData } = await supabase.from("teams").select("name").eq("id", r.team_id).single();
      setPublisherInfo({ name: teamData?.name || "未知團隊", href: `/team/${r.team_id}` });
    } else if (r.author_id) {
      const { data: profileData } = await supabase.from("profiles").select("display_name").eq("id", r.author_id).single();
      setPublisherInfo({ name: profileData?.display_name || "未知使用者", href: `/profile/${r.author_id}` });
    }

    if (!user) { setCanEdit(false); }
    else if (isAdmin) { setCanEdit(true); }
    else if (r.author_id === user.id) { setCanEdit(true); }
    else if (r.type === "team" && r.team_id) {
      const { data: tm } = await supabase.from("team_members").select("role").eq("team_id", r.team_id).eq("user_id", user.id).single();
      setCanEdit(tm?.role === "leader");
    } else { setCanEdit(false); }

    setIsLoading(false);
  }, [supabase, id, router, user, isAdmin]);

  const fetchTags = useCallback(async () => {
    const [tagsRes, assignedRes] = await Promise.all([
      supabase.from("tags").select("*").order("sort_order").order("created_at"),
      supabase.from("result_tags").select("tag_id").eq("result_id", id),
    ]);
    const allTags = (tagsRes.data as Tag[]) || [];
    const parents = allTags.filter((t) => t.parent_id === null);
    setTagGroups(parents.map((p) => ({ ...p, children: allTags.filter((c) => c.parent_id === p.id) })));
    setAssignedTagIds(new Set((assignedRes.data || []).map((r: { tag_id: string }) => r.tag_id)));
  }, [supabase, id]);

  useEffect(() => {
    if (!authLoading && !user) { router.push("/login"); return; }
    if (user) { fetchResult(); fetchTags(); }
  }, [user, authLoading, fetchResult, fetchTags, router]);

  const handleTagToggle = async (tagId: string) => {
    if (isSavingTags) return;
    setIsSavingTags(true);

    if (assignedTagIds.has(tagId)) {
      // Deselect
      await supabase.from("result_tags").delete().eq("result_id", id).eq("tag_id", tagId);
      setAssignedTagIds(new Set());
    } else {
      // Single-select: remove all existing tags, then insert the new one
      await supabase.from("result_tags").delete().eq("result_id", id);
      await supabase.from("result_tags").insert({ result_id: id, tag_id: tagId });
      setAssignedTagIds(new Set([tagId]));
    }

    setIsSavingTags(false);
  };

  const handleSave = async () => {
    if (!result) return;
    setIsSaving(true);
    const { error } = await supabase.from("results").update({
      title: result.title, date: result.date, summary: result.summary,
      header_image: result.header_image ?? null, content: result.content,
    }).eq("id", id);
    if (!error) setSavedResult({ ...result });
    setIsSaving(false);
  };

  const handlePublish = async () => {
    if (!result) return;
    setIsPublishing(true);
    const newStatus: "draft" | "published" = result.status === "published" ? "draft" : "published";
    const { error } = await supabase.from("results").update({
      title: result.title, date: result.date, summary: result.summary,
      header_image: result.header_image ?? null, content: result.content, status: newStatus,
    }).eq("id", id);
    if (!error) {
      const updated: Result = { ...result, status: newStatus };
      setResult(updated); setSavedResult(updated);
    }
    setIsPublishing(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !result) return;
    setIsUploadingImage(true);
    const uploadResult = await uploadResultImage(file);
    e.target.value = "";
    if ("error" in uploadResult) { toast.error(uploadResult.error); }
    else { setResult({ ...result, header_image: uploadResult.url }); }
    setIsUploadingImage(false);
  };

  const handleDelete = async () => {
    if (!confirm("確定要刪除這則成果嗎？")) return;
    setIsDeleting(true);
    const { error } = await supabase.from("results").delete().eq("id", id);
    if (error) { console.error("Error deleting result:", error.message, error.code); setIsDeleting(false); return; }
    router.push(user ? `/profile/${user.id}` : "/");
  };

  if (isLoading || authLoading) {
    return (
      <div className="container max-w-4xl mx-auto p-4 flex justify-center items-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!result) return null;
  if (canEdit === false) { router.push(user ? `/profile/${user.id}` : "/"); return null; }

  return (
    <div className="container max-w-6xl mx-auto p-4 flex flex-col mt-8 pb-16">
      {/* Sticky toolbar：只固定上方操作列，內容與屬性一起滾動 */}
      <div className="sticky top-16 z-20 bg-background/80 backdrop-blur-sm py-4 -mx-4 px-4">
        <div className="flex items-center justify-between gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push(user ? `/profile/${user.id}` : "/")}>
            <ArrowLeft className="w-4 h-4" />
            返回列表
          </Button>
          <div className="flex gap-2">
            <Button variant={isPreview ? "secondary" : "ghost"} size="sm" onClick={() => setIsPreview(v => !v)}>
              {isPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {isPreview ? "編輯" : "預覽"}
            </Button>
            <Button variant={hasChanges ? "outline" : "ghost"} onClick={handleSave} disabled={isSaving || !hasChanges}>
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : hasChanges ? <Save className="w-4 h-4" /> : <Check className="w-4 h-4 text-green-600" />}
              {hasChanges ? "儲存" : "已儲存"}
            </Button>
            <Button variant={result.status === "published" ? "secondary" : "default"} onClick={handlePublish} disabled={isPublishing}>
              {isPublishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {result.status === "published" ? "取消發布" : "發布"}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              刪除
            </Button>
          </div>
        </div>
      </div>

      {!isPreview && (
        <div className="mt-6 grid grid-cols-1 gap-4">
          {/* Cover image */}
          <div className="flex flex-col gap-1">
            <Label className="text-sm mx-2">封面圖片</Label>
            <div className="flex items-start gap-4">
              <div className="relative w-40 aspect-video rounded-lg overflow-hidden bg-muted shrink-0">
                <Image src={result.header_image || "/placeholder.png"} alt={result.title} fill className="object-cover"
                  unoptimized={isExternalImage(result.header_image)} />
              </div>
              <div className="flex flex-col gap-2">
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" onChange={handleImageUpload} />
                <Button type="button" variant="outline" size="sm" disabled={isUploadingImage} onClick={() => fileInputRef.current?.click()}>
                  {isUploadingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
                  {isUploadingImage ? "上傳中…" : "上傳圖片"}
                </Button>
                <p className="text-xs text-muted-foreground">JPEG、PNG、GIF、WebP，最大 5MB</p>
              </div>
            </div>
          </div>

          {/* Title & date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <Label htmlFor="title" className="text-sm mx-2">標題</Label>
              <Input id="title" value={result.title} onChange={(e) => setResult({ ...result, title: e.target.value })} placeholder="請輸入成果標題" />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="date" className="text-sm mx-2">日期</Label>
              <Input id="date" type="date" value={result.date} onChange={(e) => setResult({ ...result, date: e.target.value })} />
            </div>
          </div>

          {/* Summary */}
          <div className="flex flex-col gap-1">
            <Label htmlFor="summary" className="text-sm mx-2">摘要（卡片預覽用，選填）</Label>
            <Input id="summary" value={result.summary} onChange={(e) => setResult({ ...result, summary: e.target.value })} placeholder="簡短描述，顯示於列表卡片" />
          </div>

          {/* Tags */}
          {tagGroups.length > 0 && (
            <div className="flex flex-col gap-2">
              <Label className="text-sm mx-2 flex items-center gap-1.5">
                <TagIcon className="w-3.5 h-3.5" />
                標籤
                {isSavingTags && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
              </Label>
              <div className="flex flex-wrap gap-3">
                {tagGroups.map((parent) => (
                  <div key={parent.id} className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold text-muted-foreground px-1">{parent.name}</span>
                    <div className="flex flex-wrap gap-1.5">
                      {parent.children.map((child) => {
                        const active = assignedTagIds.has(child.id);
                        return (
                          <button
                            key={child.id}
                            type="button"
                            onClick={() => handleTagToggle(child.id)}
                            className={`px-2.5 py-0.5 rounded-full text-sm border transition-colors ${
                              active
                                ? "bg-foreground text-background border-foreground"
                                : "bg-transparent text-muted-foreground border-border hover:border-foreground hover:text-foreground"
                            }`}
                          >
                            {child.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {isPreview ? (
        <div className="py-12">
          <ResultDetail result={result} publisherInfo={publisherInfo} />
        </div>
      ) : (
        <TiptapEditor content={result.content} onChange={(content) => setResult({ ...result, content })} />
      )}
    </div>
  );
}
