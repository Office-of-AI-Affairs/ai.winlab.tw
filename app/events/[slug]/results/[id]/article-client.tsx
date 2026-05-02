"use client"

import { revalidateAllEventCaches } from "@/app/events/actions"
import { useAuth } from "@/components/auth-provider"
import { CoauthorEditor } from "@/components/coauthor-editor"
import { EditActionsPill, type EditStatus } from "@/components/edit-actions-pill"
import { EditModeToggle } from "@/components/edit-mode-toggle"
import { JsonLd } from "@/components/json-ld"
import { RichTextSurface } from "@/components/rich-text-surface"
import { ShareButtons } from "@/components/share-buttons"
import { Toc } from "@/components/toc"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useContentEditor } from "@/hooks/use-content-editor"
import { useEditMode } from "@/hooks/use-edit-mode"
import { useImageUpload } from "@/hooks/use-image-upload"
import { formatDate } from "@/lib/date"
import { buildBreadcrumbJsonLd } from "@/lib/seo/breadcrumb"
import type { TocItem } from "@/lib/ui/article"
import type { PublicProfile, Result } from "@/lib/supabase/types"
import { uploadResultImage } from "@/lib/upload-image"
import { isExternalImage, resolveImageSrc } from "@/lib/utils"
import { ArrowLeft, ImagePlus, Loader2, LogOut, Send, Trash2, User } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"

export type ResultPublisher = { id: string; name: string } | null

type Props = {
  slug: string
  eventName: string
  initialResult: Result
  initialContentHtml: string | null
  initialToc: TocItem[]
  readingTimeMin: number
  initialPublisher: ResultPublisher
  initialCoauthors: PublicProfile[]
  initialMode?: "view" | "edit"
}

export function ResultArticleClient({
  slug,
  eventName,
  initialResult,
  initialContentHtml,
  initialToc,
  readingTimeMin,
  initialPublisher,
  initialCoauthors,
  initialMode,
}: Props) {
  const router = useRouter()
  const { user, isAdmin } = useAuth()
  const isAuthor = !!user && user.id === initialResult.author_id
  const canEdit = isAdmin || isAuthor
  const { isEditing, setMode } = useEditMode({ enabled: canEdit })
  const [didApplyInitialMode, setDidApplyInitialMode] = useState(false)

  useEffect(() => {
    if (didApplyInitialMode) return
    if (initialMode === "edit" && canEdit) setMode("edit")
    setDidApplyInitialMode(true)
  }, [didApplyInitialMode, initialMode, canEdit, setMode])

  const {
    data: result,
    setData: setResult,
    hasChanges,
    isSaving,
    isPublishing,
    isDeleting,
    save,
    publish,
    remove,
  } = useContentEditor({
    table: "results",
    id: initialResult.id,
    initialData: initialResult,
    fields: ["title", "summary", "header_image", "content"],
    redirectTo: `/events/${slug}?tab=results`,
    onAfterSave: revalidateAllEventCaches,
    onAfterPublish: revalidateAllEventCaches,
    onAfterRemove: revalidateAllEventCaches,
  })

  const [renderedHtml, setRenderedHtml] = useState<string | null>(initialContentHtml)
  const [toc, setToc] = useState<TocItem[]>(initialToc)
  const [coauthors, setCoauthors] = useState<PublicProfile[]>(initialCoauthors)
  const [actionsOpen, setActionsOpen] = useState(false)

  const { isUploading: isUploadingImage, fileInputRef, triggerFileInput, handleFileChange } =
    useImageUpload(uploadResultImage)

  const onImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const url = await handleFileChange(event)
    if (url) setResult((prev) => ({ ...prev, header_image: url }))
  }

  // useContentEditor's save() is wired into useAutoSave (3s debounce +
  // beforeunload guard). Whenever a save lands, hasChanges flips false —
  // refresh the rendered HTML so view-mode reflects the latest content
  // when admin toggles back. Skip the regen on first mount and while dirty.
  const isInitialRender = useRef(true)
  useEffect(() => {
    if (isInitialRender.current) {
      isInitialRender.current = false
      return
    }
    if (hasChanges) return
    let cancelled = false
    void (async () => {
      const { renderArticle } = await import("@/lib/ui/rich-text")
      if (cancelled) return
      const { html, toc: nextToc } = renderArticle(
        result.content as Record<string, unknown> | null,
      )
      setRenderedHtml(html)
      setToc(nextToc)
    })()
    return () => {
      cancelled = true
    }
  }, [hasChanges, result.content])

  const exitEdit = useCallback(() => {
    if (hasChanges && !window.confirm("你有尚未儲存的變更，確定要離開嗎？")) return
    setActionsOpen(false)
    setMode("view")
  }, [hasChanges, setMode])

  useEffect(() => {
    if (!isEditing) return
    const onKey = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey)) return
      if (event.key.toLowerCase() !== "s") return
      event.preventDefault()
      if (hasChanges && !isSaving) void save()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [isEditing, hasChanges, isSaving, save])

  useEffect(() => {
    if (!isEditing || !hasChanges) return
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault()
    }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [isEditing, hasChanges])

  const status: EditStatus =
    isSaving || isPublishing || isDeleting
      ? "saving"
      : hasChanges
        ? "dirty"
        : "saved"
  const statusLabel = isDeleting
    ? "刪除中…"
    : isPublishing
      ? result.status === "published"
        ? "取消發布中…"
        : "發布中…"
      : isSaving
        ? "儲存中…"
        : hasChanges
          ? "尚未儲存"
          : result.status === "published"
            ? "已發布"
            : "草稿"

  const titleClass = "text-3xl font-bold tracking-tight mb-4"

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "首頁", path: "/" },
    { name: "活動", path: "/events" },
    { name: eventName, path: `/events/${slug}` },
    { name: result.title, path: `/events/${slug}/results/${result.id}` },
  ])

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: result.title,
    datePublished: result.date,
    url: `https://ai.winlab.tw/events/${slug}/results/${result.id}`,
    ...(initialPublisher || coauthors.length
      ? {
          author: [
            ...(initialPublisher
              ? [{ "@type": "Person", name: initialPublisher.name }]
              : []),
            ...coauthors.map((ca) => ({
              "@type": "Person",
              name: ca.display_name || "未知使用者",
            })),
          ],
        }
      : {}),
    publisher: {
      "@type": "Organization",
      name: "國立陽明交通大學 人工智慧專責辦公室",
      url: "https://ai.winlab.tw",
    },
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <JsonLd data={structuredData} />
      <JsonLd data={breadcrumbJsonLd} />

      <div className="mb-10 flex items-center justify-between gap-4">
        <Link
          href={`/events/${slug}?tab=results`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
        >
          <ArrowLeft className="w-4 h-4" />
          返回活動
        </Link>
        <ShareButtons url={`/events/${slug}/results/${result.id}`} title={result.title} />
      </div>

      <div className="mb-8 max-w-6xl">
        {isEditing ? (
          <input
            value={result.title ?? ""}
            onChange={(event) =>
              setResult((prev) => ({ ...prev, title: event.target.value }))
            }
            placeholder="輸入標題…"
            aria-label="標題"
            className={`${titleClass} w-full border-0 bg-transparent p-0 outline-none focus:outline-none placeholder:text-muted-foreground/60`}
          />
        ) : (
          <h1 className={titleClass}>{result.title}</h1>
        )}
        <div className="flex flex-wrap items-center gap-2 text-base text-muted-foreground">
          <User className="w-4 h-4 shrink-0" />
          {initialPublisher ? (
            <Link
              href={`/profile/${initialPublisher.id}`}
              className="underline underline-offset-4 hover:text-foreground transition-colors duration-200"
            >
              {initialPublisher.name}
            </Link>
          ) : null}
          {coauthors.map((ca) => (
            <Link
              key={ca.id}
              href={`/profile/${ca.id}`}
              className="underline underline-offset-4 hover:text-foreground transition-colors duration-200"
            >
              {ca.display_name || "未知使用者"}
            </Link>
          ))}
          <span aria-hidden className="opacity-30">·</span>
          <span>{formatDate(result.updated_at)}</span>
          {readingTimeMin ? (
            <>
              <span aria-hidden className="opacity-30">·</span>
              <span>閱讀 {readingTimeMin} 分鐘</span>
            </>
          ) : null}
        </div>
      </div>

      <hr className="mb-8" />

      <div className="max-w-6xl lg:flex lg:items-start lg:gap-8">
        <div className="min-w-0 flex-1">
          <RichTextSurface
            content={result.content as Record<string, unknown> | null}
            contentHtml={renderedHtml}
            editing={isEditing}
            onChange={(content) => setResult((prev) => ({ ...prev, content }))}
            emptyText="（無內容）"
          />
        </div>
        <Toc items={toc} className="hidden lg:block" />
      </div>

      {canEdit && !isEditing && <EditModeToggle onClick={() => setMode("edit")} />}

      {isEditing && (
        <EditActionsPill
          status={status}
          statusLabel={statusLabel}
          title="管理成果"
          open={actionsOpen}
          onOpenChange={setActionsOpen}
        >
          <div className="flex flex-col gap-2">
            <Label className="text-sm">封面圖片</Label>
            <div className="flex items-start gap-4">
              <div className="relative aspect-video w-40 shrink-0 overflow-hidden rounded-lg bg-muted">
                <Image
                  src={resolveImageSrc(result.header_image)}
                  alt={result.title}
                  fill
                  className="object-cover"
                  unoptimized={isExternalImage(result.header_image)}
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
            <Label htmlFor="result-summary" className="text-sm">摘要</Label>
            <Input
              id="result-summary"
              value={result.summary ?? ""}
              onChange={(event) =>
                setResult((prev) => ({ ...prev, summary: event.target.value }))
              }
              placeholder="顯示於列表卡片"
              disabled={isSaving || isPublishing || isDeleting}
            />
          </div>

          <CoauthorEditor
            resultId={initialResult.id}
            authorId={initialResult.author_id}
            initialCoauthors={coauthors}
            onCoauthorsChange={setCoauthors}
          />

          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={async () => {
                await remove()
                router.push(`/events/${slug}?tab=results`)
              }}
              disabled={isSaving || isPublishing || isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              刪除成果
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
                variant={result.status === "published" ? "outline" : "default"}
                size="sm"
                onClick={() => void publish()}
                disabled={isSaving || isPublishing || isDeleting}
              >
                {isPublishing ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
                {result.status === "published" ? "取消發布" : "發布"}
              </Button>
            </div>
          </div>
        </EditActionsPill>
      )}
    </div>
  )
}
