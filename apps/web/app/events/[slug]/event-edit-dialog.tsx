"use client"

import { revalidateAllEventCaches } from "@/app/events/actions"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useContentEditor } from "@/hooks/use-content-editor"
import { useImageUpload } from "@/hooks/use-image-upload"
import { createClient } from "@/lib/supabase/client"
import type { Event } from "@/lib/supabase/types"
import { uploadEventImage } from "@/lib/upload-image"
import { isExternalImage, resolveImageSrc } from "@/lib/utils"
import { ImagePlus, Loader2, LogOut, Pin, Save, Send, Trash2 } from "lucide-react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useRef, useState } from "react"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  event: Event
}

export function EventEditDialog({ open, onOpenChange, event: initialEvent }: Props) {
  const router = useRouter()
  const supabaseRef = useRef(createClient())
  const savedSlugRef = useRef(initialEvent.slug)
  const [slugError, setSlugError] = useState<string | null>(null)

  const {
    data: event,
    setData: setEvent,
    hasChanges,
    isSaving,
    isPublishing,
    isDeleting,
    save,
    publish,
    remove,
  } = useContentEditor({
    table: "events",
    id: initialEvent.id,
    initialData: initialEvent,
    fields: ["name", "slug", "description", "cover_image", "pinned", "sort_order"],
    redirectTo: "/events",
    onBeforeSave: async () => {
      setSlugError(null)
      if (event.slug !== savedSlugRef.current) {
        const { data: existing } = await supabaseRef.current
          .from("events")
          .select("id")
          .eq("slug", event.slug)
          .neq("id", initialEvent.id)
          .single()
        if (existing) {
          setSlugError("此 slug 已被使用，請選擇其他名稱")
          return false
        }
      }
      return true
    },
    onAfterSave: async () => {
      if (event.slug !== savedSlugRef.current) {
        router.replace(`/events/${event.slug}`)
      }
      savedSlugRef.current = event.slug
      await revalidateAllEventCaches()
      router.refresh()
    },
    onAfterPublish: async () => {
      await revalidateAllEventCaches()
      router.refresh()
    },
    onAfterRemove: async () => {
      await revalidateAllEventCaches()
    },
  })

  // The slug input's onChange already clears any stale error; we don't
  // need an effect to reset it on dialog close.

  const { isUploading: isUploadingImage, fileInputRef, triggerFileInput, handleFileChange } =
    useImageUpload(uploadEventImage)
  const onImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = await handleFileChange(e)
    if (url) setEvent((prev) => ({ ...prev, cover_image: url }))
  }

  const exitEdit = () => {
    if (hasChanges && !window.confirm("你有尚未儲存的變更，確定要離開嗎？")) return
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col gap-4 overflow-y-auto">
        <DialogHeader>
          <DialogTitle>管理活動</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <Label className="text-sm">封面圖片</Label>
          <div className="flex items-start gap-4">
            <div className="relative aspect-video w-40 shrink-0 overflow-hidden rounded-lg bg-muted">
              <Image
                src={resolveImageSrc(event.cover_image)}
                alt={event.name}
                fill
                className="object-cover"
                unoptimized={isExternalImage(event.cover_image)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="hidden"
                onChange={onImageChange}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isUploadingImage}
                onClick={triggerFileInput}
              >
                {isUploadingImage ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ImagePlus className="size-4" />
                )}
                {isUploadingImage ? "上傳中…" : "更換封面"}
              </Button>
              <p className="text-xs text-muted-foreground">JPEG / PNG / GIF / WebP，最大 5MB</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="event-name" className="text-sm">活動名稱</Label>
          <Input
            id="event-name"
            value={event.name}
            onChange={(e) => setEvent((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="例：AI新秀"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="event-slug" className="text-sm">Slug（URL 路徑）</Label>
          <Input
            id="event-slug"
            value={event.slug}
            onChange={(e) => {
              setSlugError(null)
              setEvent((prev) => ({
                ...prev,
                slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
              }))
            }}
            placeholder="例：ai-rising-star"
          />
          {slugError ? (
            <p className="text-xs text-destructive">{slugError}</p>
          ) : (
            <p className="text-xs text-muted-foreground">/events/{event.slug}</p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="event-description" className="text-sm">活動簡介</Label>
          <Textarea
            id="event-description"
            className="min-h-[80px] resize-y"
            value={event.description ?? ""}
            onChange={(e) =>
              setEvent((prev) => ({ ...prev, description: e.target.value || null }))
            }
            placeholder="活動簡短介紹（選填）"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label className="text-sm">顯示於導覽列</Label>
          <button
            type="button"
            onClick={() => setEvent((prev) => ({ ...prev, pinned: !prev.pinned }))}
            className={`flex items-center gap-2 self-start h-9 px-3 rounded-md border text-sm transition-colors ${
              event.pinned
                ? "bg-foreground text-background border-foreground"
                : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
            }`}
          >
            <Pin className="size-4" fill={event.pinned ? "currentColor" : "none"} />
            {event.pinned ? "已釘選（顯示於 Header）" : "未釘選"}
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="event-sort-order" className="text-sm">排列順序（數字越小越前）</Label>
          <Input
            id="event-sort-order"
            inputMode="numeric"
            value={event.sort_order}
            onChange={(e) => {
              const v = parseInt(e.target.value)
              setEvent((prev) => ({ ...prev, sort_order: isNaN(v) ? 0 : v }))
            }}
            className="w-32"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={async () => {
              await remove()
            }}
            disabled={isSaving || isPublishing || isDeleting}
          >
            {isDeleting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Trash2 className="size-4" />
            )}
            刪除活動
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={exitEdit}
              disabled={isSaving || isPublishing || isDeleting}
            >
              <LogOut className="size-4" />
              退出編輯
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={save}
              disabled={!hasChanges || isSaving || isPublishing || isDeleting}
            >
              {isSaving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              儲存
            </Button>
            <Button
              type="button"
              variant={event.status === "published" ? "outline" : "default"}
              size="sm"
              onClick={() => void publish()}
              disabled={isSaving || isPublishing || isDeleting}
            >
              {isPublishing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              {event.status === "published" ? "取消發布" : "發布"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
