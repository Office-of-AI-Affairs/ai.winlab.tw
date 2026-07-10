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
import { useLocale, useT } from "@/lib/i18n/locale-provider"
import type { TocItem } from "@/lib/ui/article"
import type { Introduction } from "@winlab/db"
import { LogOut } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
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
  const t = useT()
  const locale = useLocale()
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

  // useContentEditor wires save() into useAutoSave (3s debounce +
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
        introduction.content as Record<string, unknown> | null,
      )
      setRenderedHtml(html)
      setToc(nextToc)
    })()
    return () => {
      cancelled = true
    }
  }, [hasChanges, introduction.content])

  const exitEdit = useCallback(() => {
    if (hasChanges && !window.confirm(t.common.unsavedConfirm)) return
    setActionsOpen(false)
    setMode("view")
  }, [hasChanges, setMode, t])

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

  const status: EditStatus = isSaving ? "saving" : hasChanges ? "dirty" : "saved"
  const statusLabel = isSaving
    ? t.editor.status.saving
    : hasChanges
      ? t.editor.status.unsaved
      : t.editor.status.saved

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
              placeholder={t.editor.titlePlaceholder}
              aria-label={t.common.title}
              className={`${titleClass} w-full border-0 bg-transparent p-0 outline-none focus:outline-none placeholder:text-muted-foreground/60`}
            />
          ) : (
            <h1 className={titleClass}>
              {introduction.title || t.introduction.fallbackTitle}
            </h1>
          )}
          {readingTimeMin ? (
            <p className="text-sm text-muted-foreground">
              {t.article.readingTime.replace("{min}", String(readingTimeMin))}
            </p>
          ) : null}
        </div>
        <ShareButtons url="/introduction" title={t.introduction.meta.title} />
      </div>

      {locale === "en" && (
        <p className="text-sm text-muted-foreground mb-4">{t.i18nNotice.untranslated}</p>
      )}

      <div className="max-w-6xl lg:flex lg:items-start lg:gap-8">
        <div className="min-w-0 flex-1" lang="zh-Hant">
          <RichTextSurface
            content={introduction.content as Record<string, unknown> | null}
            contentHtml={renderedHtml}
            editing={isEditing}
            onChange={(content) =>
              setIntroduction((prev) => ({ ...prev, content }))
            }
            emptyText={t.editor.emptyContent}
          />
        </div>
        <Toc items={toc} className="hidden lg:block" />
      </div>

      {isAdmin && !isEditing && <EditModeToggle onClick={() => setMode("edit")} />}

      {isEditing && (
        <EditActionsPill
          status={status}
          statusLabel={statusLabel}
          title={t.introduction.manageTitle}
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
              {t.actions.exitEdit}
            </Button>
          </div>
        </EditActionsPill>
      )}
    </>
  )
}
