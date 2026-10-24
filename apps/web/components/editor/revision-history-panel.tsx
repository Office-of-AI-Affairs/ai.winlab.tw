"use client"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { formatDate } from "@/lib/date"
import { useT } from "@/lib/i18n/locale-provider"
import { listRevisions, type Revision } from "@/lib/actions/revisions"
import type { ContentRevisionTableName } from "@winlab/db"
import { History, Loader2, RotateCcw } from "lucide-react"
import { useCallback, useEffect, useState } from "react"

/**
 * Minimal version-history + one-click restore panel (#47). Lives inside
 * `EditActionsPill`'s dialog body alongside the other hidden-attribute
 * fields — see the "records" mention in that component's doc comment.
 * No diff view by design; `onRestore` receives the raw snapshot jsonb and
 * is responsible for merging it into the editor's local state + saving
 * (the save itself is an UPDATE, so it creates its own new revision).
 */
export function RevisionHistoryPanel({
  tableName,
  rowId,
  disabled,
  onRestore,
}: {
  tableName: ContentRevisionTableName
  rowId: string
  disabled?: boolean
  onRestore: (snapshot: Record<string, unknown>) => Promise<void> | void
}) {
  const t = useT()
  const [open, setOpen] = useState(false)
  // null = not loaded yet (shows the spinner). Deliberately no separate
  // "loading" boolean set synchronously at the top of `load()` — every
  // setState call below happens after an `await`, which is what keeps this
  // safe to fire-and-forget from the effect below (react-hooks/set-state
  // -in-effect flags a setState reachable before any await).
  const [revisions, setRevisions] = useState<Revision[] | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [actorNames, setActorNames] = useState<Record<string, string>>({})
  const [restoringId, setRestoringId] = useState<string | null>(null)

  const fetchRevisions = useCallback(
    () => listRevisions(tableName, rowId).catch(() => ({ ok: false as const })),
    [tableName, rowId],
  )

  const apply = useCallback((result: Awaited<ReturnType<typeof fetchRevisions>>) => {
    if (!result.ok) {
      setLoadFailed(true)
      return
    }
    setLoadFailed(false)
    setRevisions(result.revisions)
    setActorNames(result.actorNames)
  }, [])

  const load = useCallback(async () => apply(await fetchRevisions()), [apply, fetchRevisions])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    fetchRevisions().then((result) => {
      if (!cancelled) apply(result)
    })
    return () => {
      cancelled = true
    }
  }, [open, apply, fetchRevisions])

  const handleRestore = async (revision: Revision) => {
    if (!window.confirm(t.editor.history.restoreConfirm)) return
    setRestoringId(revision.id)
    try {
      await onRestore((revision.snapshot as Record<string, unknown>) ?? {})
      await load()
    } finally {
      setRestoringId(null)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-sm font-medium text-foreground"
        disabled={disabled}
      >
        <History className="size-4 text-muted-foreground" aria-hidden />
        {t.editor.history.toggleLabel}
      </button>

      {open && (
        <div className="max-h-48 overflow-y-auto rounded-md border border-border">
          {revisions === null ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          ) : loadFailed ? (
            <p className="px-3 py-4 text-sm text-muted-foreground">{t.editor.history.loadFailed}</p>
          ) : revisions.length === 0 ? (
            <p className="px-3 py-4 text-sm text-muted-foreground">{t.editor.history.empty}</p>
          ) : (
            <ul className="divide-y divide-border">
              {revisions.map((revision) => (
                <li key={revision.id} className="flex items-center justify-between gap-2 px-3 py-2">
                  <div className="min-w-0">
                    <Label className="text-sm">{formatDate(revision.created_at, "datetime")}</Label>
                    <p className="truncate text-xs text-muted-foreground">
                      {revision.changed_by
                        ? actorNames[revision.changed_by] ?? t.editor.history.unknownEditor
                        : t.editor.history.unknownEditor}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void handleRestore(revision)}
                    disabled={disabled || restoringId !== null}
                  >
                    {restoringId === revision.id ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <RotateCcw className="size-3.5" />
                    )}
                    {t.editor.history.restore}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
