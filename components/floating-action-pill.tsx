"use client"

import { Loader2, type LucideIcon } from "lucide-react"
import { forwardRef } from "react"

import { cn } from "@/lib/utils"

type Props = {
  icon: LucideIcon
  label: string
  onClick?: () => void
  /** Disable the pill (e.g. while a create RPC is in flight). */
  disabled?: boolean
  /** Swap the icon for a spinning Loader2 (and disable the button). */
  loading?: boolean
  /** Optional keyboard-shortcut hint shown on the right of the label. */
  shortcut?: string
  className?: string
  ariaLabel?: string
}

/**
 * Generic floating action pill — bottom-right, capsule shape, glass surface.
 * Used by `<EditModeToggle>` (entering edit mode), the events page tabs
 * (`+新增公告`, `+新增徵才`, etc.), and any future page-level floating action.
 *
 * Forwards refs and onClick so it works as a Radix DialogTrigger asChild
 * (e.g. inside AddMemberButton).
 */
export const FloatingActionPill = forwardRef<HTMLButtonElement, Props>(
  function FloatingActionPill(
    { icon: Icon, label, onClick, disabled, loading, shortcut, className, ariaLabel, ...rest },
    ref,
  ) {
    const ResolvedIcon = loading ? Loader2 : Icon
    return (
      <button
        ref={ref}
        type="button"
        onClick={onClick}
        disabled={disabled || loading}
        aria-label={ariaLabel ?? label}
        className={cn(
          "interactive-scale fixed bottom-4 right-4 z-30 inline-flex h-10 items-center gap-2 rounded-full border border-border bg-background/95 px-4 text-sm font-medium text-foreground shadow-lg backdrop-blur-sm transition-colors duration-200 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60 md:bottom-6 md:right-6",
          className,
        )}
        {...rest}
      >
        <ResolvedIcon className={cn("size-4", loading && "animate-spin")} />
        {label}
        {shortcut && (
          <kbd
            aria-hidden
            className="ml-1 hidden rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline"
          >
            {shortcut}
          </kbd>
        )}
      </button>
    )
  },
)
