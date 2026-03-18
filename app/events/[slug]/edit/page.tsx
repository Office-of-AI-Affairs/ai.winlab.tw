"use client";

import { useAuth } from "@/components/auth-provider";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import type { Event } from "@/lib/supabase/types";
import { uploadEventImage } from "@/lib/upload-image";
import { isExternalImage } from "@/lib/utils";
import { useAutoSave } from "@/hooks/use-auto-save";
import { toast } from "sonner";
import {
  ArrowLeft,
  Check,
  ImagePlus,
  Loader2,
  Pin,
  Save,
  Send,
  Trash2,
} from "lucide-react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export default function EventEditPage() {
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;
  const supabase = createClient();

  const [event, setEvent] = useState<Event | null>(null);
  const [savedEvent, setSavedEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [slugError, setSlugError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasChanges = event && savedEvent
    ? event.name !== savedEvent.name ||
      event.slug !== savedEvent.slug ||
      (event.description ?? "") !== (savedEvent.description ?? "") ||
      (event.cover_image ?? "") !== (savedEvent.cover_image ?? "") ||
      event.pinned !== savedEvent.pinned ||
      event.sort_order !== savedEvent.sort_order
    : false;

  useEffect(() => {
    if (!authLoading && !user) { router.push("/login"); return; }
    if (!authLoading && user && !isAdmin) { router.push("/events"); return; }
    if (!(user && isAdmin)) return;

    let cancelled = false;

    async function loadEvent() {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("slug", slug)
        .single();

      if (error || !data) {
        router.push("/events");
        return;
      }

      if (cancelled) return;

      setEvent(data as Event);
      setSavedEvent(data as Event);
      setIsLoading(false);
    }

    void loadEvent();

    return () => {
      cancelled = true;
    };
  }, [authLoading, isAdmin, router, slug, supabase, user]);

  const handleSave = async () => {
    if (!event) return;
    setSlugError(null);

    if (event.slug !== savedEvent?.slug) {
      const { data: existing } = await supabase
        .from("events")
        .select("id")
        .eq("slug", event.slug)
        .neq("id", event.id)
        .single();
      if (existing) {
        setSlugError("此 slug 已被使用，請選擇其他名稱");
        return;
      }
    }

    setIsSaving(true);
    const { error } = await supabase.from("events").update({
      name: event.name,
      slug: event.slug,
      description: event.description,
      cover_image: event.cover_image,
      pinned: event.pinned,
      sort_order: event.sort_order,
    }).eq("id", event.id);

    if (!error) {
      setSavedEvent({ ...event });
      if (event.slug !== slug) {
        router.replace(`/events/${event.slug}/edit`);
      }
    }
    setIsSaving(false);
  };

  const { guardNavigation } = useAutoSave({ hasChanges, onSave: handleSave });

  const handlePublish = async () => {
    if (!event) return;
    setIsPublishing(true);
    const newStatus: "draft" | "published" = event.status === "published" ? "draft" : "published";
    const { error } = await supabase.from("events").update({
      name: event.name,
      slug: event.slug,
      description: event.description,
      cover_image: event.cover_image,
      pinned: event.pinned,
      sort_order: event.sort_order,
      status: newStatus,
    }).eq("id", event.id);
    if (!error) {
      const updated = { ...event, status: newStatus };
      setEvent(updated);
      setSavedEvent(updated);
    }
    setIsPublishing(false);
  };

  const handleDelete = async () => {
    if (!event || !confirm("確定要刪除此活動嗎？活動下的公告與徵才將一併刪除。")) return;
    setIsDeleting(true);
    const { error } = await supabase.from("events").delete().eq("id", event.id);
    if (error) { setIsDeleting(false); return; }
    router.push("/events");
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !event) return;
    setIsUploadingImage(true);
    const result = await uploadEventImage(file);
    e.target.value = "";
    if ("error" in result) { toast.error(result.error); }
    else { setEvent({ ...event, cover_image: result.url }); }
    setIsUploadingImage(false);
  };

  if (isLoading || authLoading) {
    return (
      <PageShell tone="centeredState">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </PageShell>
    );
  }
  if (!event) return null;

  return (
    <PageShell tone="editor">
      {/* Sticky toolbar */}
      <div className="sticky top-16 z-20 bg-background/80 backdrop-blur-sm py-4 -mx-4 px-4 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <Button variant="ghost" size="sm" onClick={() => guardNavigation(() => router.push("/events"))}>
            <ArrowLeft className="w-4 h-4" />
            返回列表
          </Button>
          <div className="flex gap-2">
            <Button variant={hasChanges ? "outline" : "ghost"} onClick={handleSave} disabled={isSaving || !hasChanges}>
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : hasChanges ? <Save className="w-4 h-4" /> : <Check className="w-4 h-4 text-green-600" />}
              {hasChanges ? "儲存" : "已儲存"}
            </Button>
            <Button variant={event.status === "published" ? "secondary" : "default"} onClick={handlePublish} disabled={isPublishing}>
              {isPublishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {event.status === "published" ? "取消發布" : "發布"}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              刪除
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-6">
        {/* Cover image */}
        <div className="flex flex-col gap-1">
          <Label className="text-sm mx-2">封面圖片</Label>
          <div className="flex items-start gap-4">
            <div className="relative w-48 aspect-video rounded-lg overflow-hidden bg-muted shrink-0">
              <Image
                src={event.cover_image || "/placeholder.png"}
                alt={event.name}
                fill
                className="object-cover"
                unoptimized={isExternalImage(event.cover_image)}
              />
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

        {/* Name & slug */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <Label htmlFor="name" className="text-sm mx-2">活動名稱</Label>
            <Input
              id="name"
              value={event.name}
              onChange={(e) => setEvent({ ...event, name: e.target.value })}
              placeholder="例：AI新秀"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="slug" className="text-sm mx-2">Slug（URL 路徑）</Label>
            <Input
              id="slug"
              value={event.slug}
              onChange={(e) => {
                setSlugError(null);
                setEvent({ ...event, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") });
              }}
              placeholder="例：ai-rising-star"
            />
            {slugError && <p className="text-xs text-destructive mx-2">{slugError}</p>}
            <p className="text-xs text-muted-foreground mx-2">/events/{event.slug}</p>
          </div>
        </div>

        {/* Description */}
        <div className="flex flex-col gap-1">
          <Label htmlFor="description" className="text-sm mx-2">活動簡介</Label>
          <Textarea
            id="description"
            className="min-h-[80px] resize-y"
            value={event.description ?? ""}
            onChange={(e) => setEvent({ ...event, description: e.target.value || null })}
            placeholder="活動簡短介紹（選填）"
          />
        </div>

        {/* Pinned & sort_order */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <Label className="text-sm mx-2">顯示於導覽列</Label>
            <button
              type="button"
              onClick={() => setEvent({ ...event, pinned: !event.pinned })}
              className={`flex items-center gap-2 h-9 px-3 rounded-md border text-sm transition-colors ${event.pinned
                ? "bg-foreground text-background border-foreground"
                : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
              }`}
            >
              <Pin className="w-4 h-4" fill={event.pinned ? "currentColor" : "none"} />
              {event.pinned ? "已訂選（顯示於 Header）" : "未訂選"}
            </button>
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="sort_order" className="text-sm mx-2">排列順序（數字越小越前）</Label>
            <Input
              id="sort_order"
              inputMode="numeric"
              value={event.sort_order}
              onChange={(e) => {
                const v = parseInt(e.target.value);
                setEvent({ ...event, sort_order: isNaN(v) ? 0 : v });
              }}
              className="w-32"
            />
          </div>
        </div>
      </div>
    </PageShell>
  );
}
