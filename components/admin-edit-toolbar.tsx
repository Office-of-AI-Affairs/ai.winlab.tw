"use client"

import { Check, Loader2, X } from "lucide-react"
import { cn } from "@/lib/utils"

export type EditStatus = "saved" | "saving" | "dirty" | "error"

const defaultStatusLabel: Record<EditStatus, string> = {
  saved: "已儲存",
  saving: "儲存中…",
  dirty: "尚未儲存",
  error: "儲存失敗",
}

type Props = {
  status: EditStatus
  /** Override the default status label (e.g. "v3 已發布"). */
  statusLabel?: string
  onExit?: () => void
  exitLabel?: string
  /** Primary actions (publish/save). Right-aligned in the toolbar. */
  children?: React.ReactNode
  /** Secondary actions (history, more menu). Sit left of the primary group. */
  secondaryActions?: React.ReactNode
  className?: string
}

/**
 * Sticky toolbar shown when a page is in edit mode. Generic over the data
 * type — pages plug their own status copy and action buttons in via props.
 * Visual stance: floats over the content with backdrop blur instead of
 * pushing the layout down, so the page itself stays visually identical to
 * its view mode.
 */
export function AdminEditToolbar({
  status,
  statusLabel,
  onExit,
  exitLabel = "退出編輯",
  children,
  secondaryActions,
  className,
}: Props) {
  return (
    <div
      data-slot="admin-edit-toolbar"
      className={cn(
        "sticky top-16 z-20 -mx-4 border-b border-border/60 bg-background/80 px-4 py-3 backdrop-blur-sm",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {onExit && (
            <button
              type="button"
              onClick={onExit}
              className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="size-4" aria-hidden />
              {exitLabel}
            </button>
          )}
          <StatusIndicator
            status={status}
            label={statusLabel ?? defaultStatusLabel[status]}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {secondaryActions}
          {children}
        </div>
      </div>
    </div>
  )
}

function StatusIndicator({ status, label }: { status: EditStatus; label: string }) {
  return (
    <span
      data-slot="admin-edit-status"
      data-status={status}
      className={cn(
        "inline-flex items-center gap-1.5 text-xs",
        status === "error" ? "text-destructive" : "text-muted-foreground",
      )}
    >
      {status === "saving" ? (
        <Loader2 className="size-3 animate-spin" aria-hidden />
      ) : status === "saved" ? (
        <Check className="size-3" aria-hidden />
      ) : (
        <span
          aria-hidden
          className={cn(
            "size-1.5 rounded-full",
            status === "error" ? "bg-destructive" : "bg-foreground",
          )}
        />
      )}
      {label}
    </span>
  )
}
