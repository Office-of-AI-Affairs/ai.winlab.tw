"use client"

import { EditActionsPill, type EditStatus } from "@/components/edit-actions-pill"
import { EditModeToggle } from "@/components/edit-mode-toggle"
import { useAuth } from "@/components/auth-provider"
import { RichTextSurface } from "@/components/rich-text-surface"
import { ShareButtons } from "@/components/share-buttons"
import { Toc } from "@/components/toc"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { useEditMode } from "@/hooks/use-edit-mode"
import { formatDate } from "@/lib/date"
import { createClient } from "@/lib/supabase/client"
import type { TocItem } from "@/lib/ui/article"
import { Check, LogOut, RotateCcw, Send } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { revalidatePrivacy } from "./actions"

type VersionRecord = {
  id: string
  version: number
  content: Record<string, unknown>
  note: string | null
  created_at: string
  profiles: { display_name: string | null } | null
}

type Props = {
  initialContent: Record<string, unknown> | null
  initialContentHtml: string | null
  initialToc: TocItem[]
  currentVersion: number
  currentUpdatedAt: string | null
  readingTimeMin: number
}

export function PrivacyClient({
  initialContent,
  initialContentHtml,
  initialToc,
  currentVersion,
  currentUpdatedAt,
  readingTimeMin,
}: Props) {
  const { user, isAdmin } = useAuth()
  const { isEditing, setMode } = useEditMode({ enabled: isAdmin })

  const [content, setContent] = useState<Record<string, unknown>>(initialContent ?? {})
  const [savedContent, setSavedContent] = useState<Record<string, unknown>>(initialContent ?? {})
  const [renderedHtml, setRenderedHtml] = useState<string | null>(initialContentHtml)
  const [toc, setToc] = useState<TocItem[]>(initialToc)
  const [latestVersion, setLatestVersion] = useState(currentVersion)
  const [latestUpdatedAt, setLatestUpdatedAt] = useState(currentUpdatedAt)
  const [note, setNote] = useState("")
  const [isPublishing, setIsPublishing] = useState(false)
  const [actionsOpen, setActionsOpen] = useState(false)
  const [versionsLoaded, setVersionsLoaded] = useState(false)
  const [versions, setVersions] = useState<VersionRecord[]>([])
  const supabaseRef = useRef(createClient())

  const hasChanges = useMemo(
    () => JSON.stringify(content) !== JSON.stringify(savedContent),
    [content, savedContent],
  )

  const status: EditStatus = isPublishing ? "saving" : hasChanges ? "dirty" : "saved"
  const statusLabel = isPublishing
    ? "發布中…"
    : hasChanges
      ? "尚未發布"
      : latestVersion > 0
        ? `第 ${latestVersion} 版`
        : "尚無版本"

  const loadVersions = useCallback(
    async (force = false) => {
      if (versionsLoaded && !force) return
      const { data, error } = await supabaseRef.current
        .from("privacy_policy")
        .select("id, version, content, note, created_at, profiles!created_by(display_name)")
        .order("version", { ascending: false })
      if (error) {
        toast.error("載入版本紀錄失敗")
        return
      }
      setVersions((data ?? []) as unknown as VersionRecord[])
      setVersionsLoaded(true)
    },
    [versionsLoaded],
  )

  const publish = useCallback(async () => {
    if (!user || !hasChanges || isPublishing) return
    setIsPublishing(true)
    const nextVersion = latestVersion + 1
    const { data, error } = await supabaseRef.current
      .from("privacy_policy")
      .insert({
        content: content as never,
        version: nextVersion,
        note: note.trim() || null,
        created_by: user.id,
      })
      .select("id, version, content, created_at")
      .single()
    if (error || !data) {
      toast.error("發布失敗")
      setIsPublishing(false)
      return
    }

    // Re-render the article HTML on the client so view-mode reflects the
    // new version immediately. Tiptap-html is already loaded for admins
    // (the editor pulled it in), so this is a cheap dynamic import.
    const { renderArticle } = await import("@/lib/ui/rich-text")
    const { html, toc: nextToc } = renderArticle(content)

    setSavedContent({ ...content })
    setRenderedHtml(html)
    setToc(nextToc)
    setLatestVersion(data.version)
    setLatestUpdatedAt(data.created_at)
    setNote("")
    setVersionsLoaded(false)
    await revalidatePrivacy()
    toast.success(`已發布第 ${data.version} 版`)
    setIsPublishing(false)
    setActionsOpen(false)
  }, [content, hasChanges, isPublishing, latestVersion, note, user])

  const restoreVersion = useCallback((version: VersionRecord) => {
    setContent(version.content)
    toast.message(`已載入第 ${version.version} 版內容，記得發布新版本`)
  }, [])

  const exitEdit = useCallback(() => {
    if (hasChanges && !window.confirm("你有尚未發布的變更，確定要離開嗎？")) return
    setActionsOpen(false)
    setMode("view")
  }, [hasChanges, setMode])

  // ⌘S to publish while editing.
  useEffect(() => {
    if (!isEditing) return
    const onKey = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey)) return
      if (event.key.toLowerCase() !== "s") return
      event.preventDefault()
      void publish()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [isEditing, publish])

  // beforeunload guard while editing with unsaved changes.
  useEffect(() => {
    if (!isEditing || !hasChanges) return
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault()
    }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [isEditing, hasChanges])

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="mb-2 flex items-start justify-between gap-4">
        <h1 className="text-3xl font-bold">隱私權政策</h1>
        <ShareButtons url="/privacy" title="隱私權政策｜人工智慧專責辦公室" />
      </div>
      <p className="mb-10 text-sm text-muted-foreground">
        {latestUpdatedAt && (
          <>
            最後更新：{formatDate(latestUpdatedAt, "long")}
            {latestVersion ? `（第 ${latestVersion} 版）` : ""}
          </>
        )}
        {readingTimeMin ? (
          <>
            {latestUpdatedAt ? <span className="mx-2 opacity-30">·</span> : null}
            閱讀 {readingTimeMin} 分鐘
          </>
        ) : null}
      </p>

      <div className="lg:flex lg:items-start lg:gap-8">
        <div className="min-w-0 flex-1">
          <RichTextSurface
            content={content}
            contentHtml={renderedHtml}
            editing={isEditing}
            onChange={setContent}
            emptyText="隱私權政策尚未設定。"
          />
        </div>
        <Toc items={toc} className="hidden lg:block" />
      </div>

      {isAdmin && !isEditing && <EditModeToggle onClick={() => setMode("edit")} />}

      {isEditing && (
        <EditActionsPill
          status={status}
          statusLabel={statusLabel}
          title="管理隱私權政策"
          open={actionsOpen}
          onOpenChange={(open) => {
            setActionsOpen(open)
            if (open) void loadVersions()
          }}
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="privacy-note" className="text-sm">
              版本備註
            </Label>
            <Input
              id="privacy-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="本次修訂重點（選填）"
              disabled={isPublishing}
            />
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={exitEdit}
              disabled={isPublishing}
            >
              <LogOut className="size-4" />
              退出編輯
            </Button>
            <Button
              type="button"
              onClick={publish}
              disabled={!hasChanges || isPublishing}
              size="sm"
            >
              <Send className="size-4" />
              發布新版本
            </Button>
          </div>

          <Separator />

          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold">版本紀錄</h3>
            <VersionHistoryTable
              versions={versions}
              latestVersion={latestVersion}
              onRestore={restoreVersion}
              loaded={versionsLoaded}
            />
          </div>
        </EditActionsPill>
      )}
    </div>
  )
}

function VersionHistoryTable({
  versions,
  latestVersion,
  onRestore,
  loaded,
}: {
  versions: VersionRecord[]
  latestVersion: number
  onRestore: (version: VersionRecord) => void
  loaded: boolean
}) {
  if (!loaded) {
    return <p className="py-6 text-center text-sm text-muted-foreground">載入中…</p>
  }
  if (versions.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">尚無版本紀錄</p>
  }
  return (
    <ul className="max-h-72 divide-y overflow-auto">
      {versions.map((version) => {
        const isCurrent = version.version === latestVersion
        return (
          <li
            key={version.id}
            className="flex items-start gap-3 py-3 hover:bg-muted/30"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                <span className="font-mono">v{version.version}</span>
                <span aria-hidden className="opacity-30">·</span>
                <span>{formatDate(version.created_at, "long")}</span>
                {version.profiles?.display_name ? (
                  <>
                    <span aria-hidden className="opacity-30">·</span>
                    <span>{version.profiles.display_name}</span>
                  </>
                ) : null}
              </div>
              <p className="mt-1 text-sm">
                {version.note || (
                  <span className="text-muted-foreground">尚無備註</span>
                )}
              </p>
            </div>
            {isCurrent ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                tabIndex={-1}
                aria-current="true"
                className="pointer-events-none shrink-0 self-center"
              >
                <Check className="size-3.5" />
                目前
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 self-center"
                onClick={() => onRestore(version)}
              >
                <RotateCcw className="size-3.5" />
                載入
              </Button>
            )}
          </li>
        )
      })}
    </ul>
  )
}
