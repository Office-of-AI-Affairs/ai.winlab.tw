"use client"

import { useAuth } from "@/components/auth-provider"
import { EditActionsPill, type EditStatus } from "@/components/edit-actions-pill"
import { EditModeToggle } from "@/components/edit-mode-toggle"
import { RichTextSurface } from "@/components/rich-text-surface"
import { ShareButtons } from "@/components/share-buttons"
import { Toc } from "@/components/toc"
import { Button } from "@/components/ui/button"
import { useContentEditor } from "@/hooks/use-content-editor"
import { useEditMode } from "@/hooks/use-edit-mode"
import type { TocItem } from "@/lib/ui/article"
import type { Introduction } from "@/lib/supabase/types"
import { Loader2, LogOut, Save } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { revalidateIntroduction } from "./actions"

type Props = {
  initialIntroduction: Introduction
  initialContentHtml: string | null
  initialToc: TocItem[]
  readingTimeMin: number
}

export function IntroductionArticleClient({
  initialIntroduction,
  initialContentHtml,
  initialToc,
  readingTimeMin,
}: Props) {
  const { isAdmin } = useAuth()
  const { isEditing, setMode } = useEditMode({ enabled: isAdmin })

  const {
    data: introduction,
    setData: setIntroduction,
    hasChanges,
    isSaving,
    save,
  } = useContentEditor({
    table: "introduction",
    id: initialIntroduction.id,
    initialData: initialIntroduction,
    fields: ["title", "content"],
    redirectTo: "/introduction",
    publishable: false,
    onAfterSave: revalidateIntroduction,
  })

  const [renderedHtml, setRenderedHtml] = useState<string | null>(initialContentHtml)
  const [toc, setToc] = useState<TocItem[]>(initialToc)
  const [actionsOpen, setActionsOpen] = useState(false)

  const handleSave = useCallback(async () => {
    if (!hasChanges || isSaving) return
    await save()
    const { renderArticle } = await import("@/lib/ui/rich-text")
    const { html, toc: nextToc } = renderArticle(
      introduction.content as Record<string, unknown> | null,
    )
    setRenderedHtml(html)
    setToc(nextToc)
    setActionsOpen(false)
  }, [hasChanges, isSaving, save, introduction.content])

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

  const status: EditStatus = isSaving ? "saving" : hasChanges ? "dirty" : "saved"
  const statusLabel = isSaving ? "儲存中…" : hasChanges ? "尚未儲存" : "已儲存"

  const titleClass =
    "text-4xl font-extrabold tracking-tight text-balance"

  return (
    <>
      <div className="mb-8 flex max-w-6xl items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          {isEditing ? (
            <input
              value={introduction.title ?? ""}
              onChange={(event) =>
                setIntroduction((prev) => ({ ...prev, title: event.target.value }))
              }
              placeholder="輸入標題…"
              aria-label="標題"
              className={`${titleClass} w-full border-0 bg-transparent p-0 outline-none focus:outline-none placeholder:text-muted-foreground/60`}
            />
          ) : (
            <h1 className={titleClass}>
              {introduction.title || "國立陽明交通大學 人工智慧專責辦公室"}
            </h1>
          )}
          {readingTimeMin ? (
            <p className="text-sm text-muted-foreground">閱讀 {readingTimeMin} 分鐘</p>
          ) : null}
        </div>
        <ShareButtons url="/introduction" title="組織｜人工智慧專責辦公室" />
      </div>

      <div className="max-w-6xl lg:flex lg:items-start lg:gap-8">
        <div className="min-w-0 flex-1">
          <RichTextSurface
            content={introduction.content as Record<string, unknown> | null}
            contentHtml={renderedHtml}
            editing={isEditing}
            onChange={(content) =>
              setIntroduction((prev) => ({ ...prev, content }))
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
          title="管理組織頁"
          open={actionsOpen}
          onOpenChange={setActionsOpen}
        >
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={exitEdit}
              disabled={isSaving}
            >
              <LogOut className="size-4" />
              退出編輯
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
            >
              {isSaving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              儲存
            </Button>
          </div>
        </EditActionsPill>
      )}
    </>
  )
}
