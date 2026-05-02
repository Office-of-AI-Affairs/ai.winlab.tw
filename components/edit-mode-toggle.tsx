"use client"

import { Pencil } from "lucide-react"
import { cn } from "@/lib/utils"

type Props = {
  onClick: () => void
  className?: string
  label?: string
  /** Hide the keyboard shortcut hint (e.g. when shortcut is disabled). */
  showShortcut?: boolean
}

/**
 * Floating affordance shown to admins on a view-mode page. Clicking lifts
 * the page into edit mode without leaving the route. Mirrors the Notion
 * "Edit" entry point — visible only when relevant, never blocking content.
 */
export function EditModeToggle({
  onClick,
  className,
  label = "編輯",
  showShortcut = true,
}: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "interactive-scale fixed bottom-4 right-4 z-30 inline-flex h-10 items-center gap-2 rounded-full border border-border bg-background/95 px-4 text-sm font-medium text-foreground shadow-lg backdrop-blur-sm transition-colors duration-200 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:bottom-6 md:right-6",
        className,
      )}
    >
      <Pencil className="size-4" />
      {label}
      {showShortcut && (
        <kbd
          aria-hidden
          className="ml-1 hidden rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline"
        >
          ⌘E
        </kbd>
      )}
    </button>
  )
}
