"use client";

import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { revalidatePinnedEvents } from "@/app/events/actions";
import { useContentEditor } from "@/hooks/use-content-editor";
import { useImageUpload } from "@/hooks/use-image-upload";
import { createClient } from "@/lib/supabase/client";
import type { Event } from "@/lib/supabase/types";
import { uploadEventImage } from "@/lib/upload-image";
import { isExternalImage, resolveImageSrc } from "@/lib/utils";
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
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

export function EventEditClient({
  slug,
  initialEvent,
}: {
  slug: string;
  initialEvent: Event;
}) {
  const router = useRouter();
  const [slugError, setSlugError] = useState<string | null>(null);
  const supabaseRef = useRef(createClient());
  const savedSlug = useRef(initialEvent.slug);

  const {
    data: event, setData: setEvent, hasChanges,
    isSaving, isPublishing, isDeleting,
    save, publish, remove, guardNavigation,
  } = useContentEditor({
    table: "events",
    id: initialEvent.id,
    initialData: initialEvent,
    fields: ["name", "slug", "description", "cover_image", "pinned", "sort_order"],
    redirectTo: "/events",
    onBeforeSave: async () => {
      setSlugError(null);
      if (event.slug !== savedSlug.current) {
        const { data: existing } = await supabaseRef.current
          .from("events")
          .select("id")
          .eq("slug", event.slug)
          .neq("id", initialEvent.id)
          .single();
        if (existing) {
          setSlugError("此 slug 已被使用，請選擇其他名稱");
          return false;
        }
      }
      return true;
    },
    onAfterSave: async () => {
      if (event.slug !== slug) {
        router.replace(`/events/${event.slug}/edit`);
      }
      savedSlug.current = event.slug;
      await revalidatePinnedEvents();
    },
    onAfterPublish: () => revalidatePinnedEvents(),
    onAfterRemove: () => revalidatePinnedEvents(),
  });

  const { isUploading: isUploadingImage, fileInputRef, triggerFileInput, handleFileChange } = useImageUpload(uploadEventImage);

  const onImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = await handleFileChange(e);
    if (url) setEvent((prev) => ({ ...prev, cover_image: url }));
  };

  return (
    <PageShell tone="editor">
      <div className="sticky top-16 z-20 bg-background/80 backdrop-blur-sm py-4 -mx-4 px-4 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <Button variant="ghost" size="sm" onClick={() => guardNavigation(() => router.push("/events"))}>
            <ArrowLeft className="w-4 h-4" />
            返回列表
          </Button>
          <div className="flex gap-2">
            <Button variant={hasChanges ? "outline" : "ghost"} onClick={save} disabled={isSaving || !hasChanges}>
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : hasChanges ? <Save className="w-4 h-4" /> : <Check className="w-4 h-4 text-green-600" />}
              {hasChanges ? "儲存" : "已儲存"}
            </Button>
            <Button variant={event.status === "published" ? "secondary" : "default"} onClick={publish} disabled={isPublishing}>
              {isPublishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {event.status === "published" ? "取消發布" : "發布"}
            </Button>
            <Button variant="destructive" onClick={remove} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              刪除
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <Label className="text-sm mx-2">封面圖片</Label>
          <div className="flex items-start gap-4">
            <div className="relative w-48 aspect-video rounded-lg overflow-hidden bg-muted shrink-0">
              <Image
                src={resolveImageSrc(event.cover_image)}
                alt={event.name}
                fill
                className="object-cover"
                unoptimized={isExternalImage(event.cover_image)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" onChange={onImageChange} />
              <Button type="button" variant="outline" size="sm" disabled={isUploadingImage} onClick={triggerFileInput}>
                {isUploadingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
                {isUploadingImage ? "上傳中…" : "上傳圖片"}
              </Button>
              <p className="text-xs text-muted-foreground">JPEG、PNG、GIF、WebP，最大 5MB</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <Label htmlFor="name" className="text-sm mx-2">活動名稱</Label>
            <Input
              id="name"
              value={event.name}
              onChange={(e) => setEvent((prev) => ({ ...prev, name: e.target.value }))}
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
                setEvent((prev) => ({ ...prev, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") }));
              }}
              placeholder="例：ai-rising-star"
            />
            {slugError && <p className="text-xs text-destructive mx-2">{slugError}</p>}
            <p className="text-xs text-muted-foreground mx-2">/events/{event.slug}</p>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <Label htmlFor="description" className="text-sm mx-2">活動簡介</Label>
          <Textarea
            id="description"
            className="min-h-[80px] resize-y"
            value={event.description ?? ""}
            onChange={(e) => setEvent((prev) => ({ ...prev, description: e.target.value || null }))}
            placeholder="活動簡短介紹（選填）"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <Label className="text-sm mx-2">顯示於導覽列</Label>
            <button
              type="button"
              onClick={() => setEvent((prev) => ({ ...prev, pinned: !prev.pinned }))}
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
                setEvent((prev) => ({ ...prev, sort_order: isNaN(v) ? 0 : v }));
              }}
              className="w-32"
            />
          </div>
        </div>
      </div>
    </PageShell>
  );
}
