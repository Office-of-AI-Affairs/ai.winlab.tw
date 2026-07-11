"use client"

import { revalidateAllEventCaches } from "@/app/[locale]/events/actions"
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
import { useT } from "@/lib/i18n/locale-provider"
import type { Event } from "@winlab/db"
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
  const t = useT()
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
          setSlugError(t.events.edit.slugTaken)
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
    if (hasChanges && !window.confirm(t.common.unsavedConfirm)) return
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col gap-4 overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t.events.edit.dialogTitle}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <Label className="text-sm">{t.common.coverImage}</Label>
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
                {isUploadingImage ? t.common.uploading : t.actions.changeCover}
              </Button>
              <p className="text-xs text-muted-foreground">{t.common.imageUploadHint}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="event-name" className="text-sm">{t.events.edit.nameLabel}</Label>
          <Input
            id="event-name"
            value={event.name}
            onChange={(e) => setEvent((prev) => ({ ...prev, name: e.target.value }))}
            placeholder={t.events.edit.namePlaceholder}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="event-slug" className="text-sm">{t.events.edit.slugLabel}</Label>
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
            placeholder={t.events.edit.slugPlaceholder}
          />
          {slugError ? (
            <p className="text-xs text-destructive">{slugError}</p>
          ) : (
            <p className="text-xs text-muted-foreground">/events/{event.slug}</p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="event-description" className="text-sm">{t.events.edit.descriptionLabel}</Label>
          <Textarea
            id="event-description"
            className="min-h-[80px] resize-y"
            value={event.description ?? ""}
            onChange={(e) =>
              setEvent((prev) => ({ ...prev, description: e.target.value || null }))
            }
            placeholder={t.events.edit.descriptionPlaceholder}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label className="text-sm">{t.events.edit.pinnedLabel}</Label>
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
            {event.pinned ? t.events.edit.pinnedOn : t.events.edit.pinnedOff}
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="event-sort-order" className="text-sm">{t.events.edit.sortOrderLabel}</Label>
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
            {t.events.edit.delete}
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
              {t.actions.exitEdit}
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
              {t.actions.save}
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
              {event.status === "published" ? t.actions.unpublish : t.actions.publish}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
