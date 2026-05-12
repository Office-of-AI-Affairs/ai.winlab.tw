"use client"

import { Check, Loader2, Settings2 } from "lucide-react"
import { useState } from "react"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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
  /** Override the default status copy (e.g. "v3 已發布"). */
  statusLabel?: string
  /** Dialog heading. */
  title?: string
  /** Dialog body — page-specific actions, hidden attributes, records. */
  children?: React.ReactNode
  /** Controlled open state. Omit for uncontrolled (recommended). */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  className?: string
}

/**
 * Floating affordance shown to admins while a page is in edit mode. Keeps
 * the canvas itself byte-identical to view mode: instead of a toolbar that
 * pushes content down, all page-level edit actions (publish, hidden meta,
 * change history, exit) live behind this single button + dialog.
 */
export function EditActionsPill({
  status,
  statusLabel,
  title,
  children,
  open,
  onOpenChange,
  className,
}: Props) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = open !== undefined
  const dialogOpen = isControlled ? open : internalOpen
  const setDialogOpen = (next: boolean) => {
    if (!isControlled) setInternalOpen(next)
    onOpenChange?.(next)
  }

  const label = statusLabel ?? defaultStatusLabel[status]

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label={`${label}．展開編輯工具`}
          className={cn(
            "interactive-scale fixed bottom-4 right-4 z-30 inline-flex h-10 items-center gap-2 rounded-full border border-border bg-background/95 px-4 text-sm font-medium text-foreground shadow-lg backdrop-blur-sm transition-colors duration-200 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:bottom-6 md:right-6",
            className,
          )}
        >
          <StatusGlyph status={status} />
          {label}
          <Settings2 className="size-4 text-muted-foreground" aria-hidden />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        {title && (
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
        )}
        {children}
      </DialogContent>
    </Dialog>
  )
}

function StatusGlyph({ status }: { status: EditStatus }) {
  if (status === "saving") {
    return <Loader2 className="size-3.5 animate-spin text-muted-foreground" aria-hidden />
  }
  if (status === "saved") {
    return <Check className="size-3.5 text-muted-foreground" aria-hidden />
  }
  return (
    <span
      aria-hidden
      className={cn(
        "size-1.5 rounded-full",
        status === "error" ? "bg-destructive" : "bg-foreground",
      )}
    />
  )
}
