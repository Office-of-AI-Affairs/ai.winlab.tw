"use client"

import { useAuth } from "@/components/auth-provider"
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
import { formatDate } from "@/lib/date"
import { buildBreadcrumbJsonLd } from "@/lib/seo/breadcrumb"
import type { TocItem } from "@/lib/ui/article"
import type { Announcement } from "@/lib/supabase/types"
import { ArrowLeft, Loader2, LogOut, Save, Send, Trash2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"

export type AnnouncementArticleClientProps = {
  initialAnnouncement: Announcement
  initialContentHtml: string | null
  initialToc: TocItem[]
  readingTimeMin: number
  /** Default mode when the page mounts. Draft fallback opens straight into edit. */
  initialMode?: "view" | "edit"
  /** Where the back link points and where to redirect after delete. */
  backHref: string
  /** Label for the back link. */
  backLabel?: string
  /** Canonical URL used by share buttons + JSON-LD. */
  shareUrl: string
  /** Site-relative URL used by ShareButtons (omit the origin). */
  sharePath: string
  /** Title used for navigator.share fallback. */
  shareTitle?: string
  /** Server Action(s) to call after every save / publish / delete. */
  onCacheInvalidate: () => void | Promise<void>
  /** Breadcrumb steps for JSON-LD. The current page should be the last step. */
  breadcrumb: { name: string; path: string }[]
  /** Friendly title used by the EditActionsPill dialog header. */
  manageTitle?: string
}

export function AnnouncementArticleClient({
  initialAnnouncement,
  initialContentHtml,
  initialToc,
  readingTimeMin,
  initialMode,
  backHref,
  backLabel = "返回",
  shareUrl,
  sharePath,
  shareTitle,
  onCacheInvalidate,
  breadcrumb,
  manageTitle = "管理公告",
}: AnnouncementArticleClientProps) {
  const router = useRouter()
  const { isAdmin } = useAuth()
  const { isEditing, setMode } = useEditMode({ enabled: isAdmin })
  const [didApplyInitialMode, setDidApplyInitialMode] = useState(false)

  useEffect(() => {
    if (didApplyInitialMode) return
    if (initialMode === "edit" && isAdmin) setMode("edit")
    setDidApplyInitialMode(true)
  }, [didApplyInitialMode, initialMode, isAdmin, setMode])

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
  } = useContentEditor({
    table: "announcements",
    id: initialAnnouncement.id,
    initialData: initialAnnouncement,
    fields: ["title", "category", "date", "content"],
    redirectTo: backHref,
    onAfterSave: onCacheInvalidate,
    onAfterPublish: onCacheInvalidate,
    onAfterRemove: onCacheInvalidate,
  })

  const [renderedHtml, setRenderedHtml] = useState<string | null>(initialContentHtml)
  const [toc, setToc] = useState<TocItem[]>(initialToc)
  const [actionsOpen, setActionsOpen] = useState(false)

  const handleSave = useCallback(async () => {
    if (!hasChanges || isSaving) return
    await save()
    const { renderArticle } = await import("@/lib/ui/rich-text")
    const { html, toc: nextToc } = renderArticle(
      announcement.content as Record<string, unknown> | null,
    )
    setRenderedHtml(html)
    setToc(nextToc)
    setActionsOpen(false)
  }, [hasChanges, isSaving, save, announcement.content])

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
      void handleSave()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [isEditing, handleSave])

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
      ? announcement.status === "published"
        ? "取消發布中…"
        : "發布中…"
      : isSaving
        ? "儲存中…"
        : hasChanges
          ? "尚未儲存"
          : announcement.status === "published"
            ? "已發布"
            : "草稿"

  const titleClass = "text-4xl font-extrabold tracking-tight text-balance mb-4"

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: announcement.title,
    datePublished: announcement.date,
    dateModified: announcement.updated_at,
    articleSection: announcement.category,
    url: shareUrl,
    publisher: {
      "@type": "Organization",
      name: "國立陽明交通大學 人工智慧專責辦公室",
      url: "https://ai.winlab.tw",
    },
  }

  const breadcrumbJsonLd = buildBreadcrumbJsonLd(breadcrumb)

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <JsonLd data={structuredData} />
      <JsonLd data={breadcrumbJsonLd} />

      <div className="mb-10 flex items-center justify-between gap-4">
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
        >
          <ArrowLeft className="w-4 h-4" />
          {backLabel}
        </Link>
        <ShareButtons url={sharePath} title={shareTitle ?? announcement.title} />
      </div>

      <div className="mb-8 max-w-6xl">
        {isEditing ? (
          <input
            value={announcement.title ?? ""}
            onChange={(event) =>
              setAnnouncement((prev) => ({ ...prev, title: event.target.value }))
            }
            placeholder="輸入標題…"
            aria-label="標題"
            className={`${titleClass} w-full border-0 bg-transparent p-0 outline-none focus:outline-none placeholder:text-muted-foreground/60`}
          />
        ) : (
          <h1 className={titleClass}>{announcement.title}</h1>
        )}
        <div className="flex flex-wrap items-center gap-2 text-base text-muted-foreground">
          <span>{formatDate(announcement.date)}</span>
          <span aria-hidden className="opacity-30">·</span>
          <span className="rounded bg-muted px-2 py-0.5 text-sm font-medium">
            {announcement.category}
          </span>
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
            content={announcement.content as Record<string, unknown> | null}
            contentHtml={renderedHtml}
            editing={isEditing}
            onChange={(content) =>
              setAnnouncement((prev) => ({ ...prev, content }))
            }
            emptyText="（無內容）"
          />
        </div>
        <Toc items={toc} className="hidden lg:block" />
      </div>

      {isAdmin && !isEditing && <EditModeToggle onClick={() => setMode("edit")} />}

      {isEditing && (
        <EditActionsPill
          status={status}
          statusLabel={statusLabel}
          title={manageTitle}
          open={actionsOpen}
          onOpenChange={setActionsOpen}
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="announcement-date" className="text-sm">公告日期</Label>
            <Input
              id="announcement-date"
              type="date"
              value={announcement.date}
              onChange={(event) =>
                setAnnouncement((prev) => ({ ...prev, date: event.target.value }))
              }
              disabled={isSaving || isPublishing || isDeleting}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="announcement-category" className="text-sm">類別</Label>
            <Input
              id="announcement-category"
              value={announcement.category}
              onChange={(event) =>
                setAnnouncement((prev) => ({ ...prev, category: event.target.value }))
              }
              placeholder="請輸入類別"
              disabled={isSaving || isPublishing || isDeleting}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={async () => {
                await remove()
                router.push(backHref)
              }}
              disabled={isSaving || isPublishing || isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              刪除公告
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
                onClick={handleSave}
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
                variant={announcement.status === "published" ? "outline" : "default"}
                size="sm"
                onClick={() => void publish()}
                disabled={isSaving || isPublishing || isDeleting}
              >
                {isPublishing ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
                {announcement.status === "published" ? "取消發布" : "發布"}
              </Button>
            </div>
          </div>
        </EditActionsPill>
      )}
    </div>
  )
}
