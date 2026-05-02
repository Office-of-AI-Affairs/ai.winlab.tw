"use client"

import { AdminEditToolbar, type EditStatus } from "@/components/admin-edit-toolbar"
import { useAuth } from "@/components/auth-provider"
import { EditModeToggle } from "@/components/edit-mode-toggle"
import { RichTextSurface } from "@/components/rich-text-surface"
import { ShareButtons } from "@/components/share-buttons"
import { Toc } from "@/components/toc"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useEditMode } from "@/hooks/use-edit-mode"
import { formatDate } from "@/lib/date"
import { createClient } from "@/lib/supabase/client"
import type { TocItem } from "@/lib/ui/article"
import { History, Loader2, RotateCcw, Send } from "lucide-react"
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
  const [historyOpen, setHistoryOpen] = useState(false)
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
        ? `第 ${latestVersion} 版 已發布`
        : "尚無版本"

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
    // new content immediately. Tiptap-html is already loaded for admins
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
  }, [content, hasChanges, isPublishing, latestVersion, note, user])

  const loadVersions = useCallback(async () => {
    if (versionsLoaded) return
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
  }, [versionsLoaded])

  const restoreVersion = useCallback((version: VersionRecord) => {
    setContent(version.content)
    setHistoryOpen(false)
    toast.message(`已載入第 ${version.version} 版內容，記得發布新版本`)
  }, [])

  const exitEdit = useCallback(() => {
    if (hasChanges && !window.confirm("你有尚未發布的變更，確定要離開嗎？")) return
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
      {isEditing && (
        <AdminEditToolbar
          status={status}
          statusLabel={statusLabel}
          onExit={exitEdit}
          secondaryActions={
            <>
              <Input
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="版本備註（選填）"
                className="h-8 w-44 text-sm"
                disabled={isPublishing}
                aria-label="版本備註"
              />
              <Dialog
                open={historyOpen}
                onOpenChange={(open) => {
                  setHistoryOpen(open)
                  if (open) void loadVersions()
                }}
              >
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <History className="size-4" />
                    歷史紀錄
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>版本紀錄</DialogTitle>
                  </DialogHeader>
                  <VersionHistoryTable
                    versions={versions}
                    latestVersion={latestVersion}
                    onRestore={restoreVersion}
                    loaded={versionsLoaded}
                  />
                </DialogContent>
              </Dialog>
            </>
          }
        >
          <Button onClick={publish} disabled={!hasChanges || isPublishing} size="sm">
            {isPublishing ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            發布新版本
          </Button>
        </AdminEditToolbar>
      )}

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
    return <p className="py-8 text-center text-sm text-muted-foreground">載入中…</p>
  }
  if (versions.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">尚無版本紀錄</p>
  }
  return (
    <div className="overflow-hidden rounded-xl border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/40">
            <th className="w-14 px-3 py-2.5 text-left font-semibold">版本</th>
            <th className="px-3 py-2.5 text-left font-semibold">發布時間</th>
            <th className="px-3 py-2.5 text-left font-semibold">發布者</th>
            <th className="px-3 py-2.5 text-left font-semibold">備註</th>
            <th className="w-24 px-3 py-2.5" />
          </tr>
        </thead>
        <tbody className="divide-y">
          {versions.map((version) => (
            <tr key={version.id} className="hover:bg-muted/30">
              <td className="px-3 py-2.5 font-mono text-muted-foreground">v{version.version}</td>
              <td className="px-3 py-2.5 text-muted-foreground">
                {formatDate(version.created_at, "long")}
              </td>
              <td className="px-3 py-2.5">{version.profiles?.display_name || "—"}</td>
              <td className="px-3 py-2.5 text-muted-foreground">{version.note || "—"}</td>
              <td className="px-3 py-2.5 text-right">
                {version.version === latestVersion ? (
                  <span className="text-xs text-muted-foreground">目前</span>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onRestore(version)}
                  >
                    <RotateCcw className="size-3.5" />
                    載入
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
