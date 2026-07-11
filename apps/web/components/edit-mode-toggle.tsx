"use client"

import { Pencil } from "lucide-react"

import { FloatingActionPill } from "@/components/floating-action-pill"
import { useT } from "@/lib/i18n/locale-provider"

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
 *
 * Thin wrapper over `<FloatingActionPill>` so all floating page-level
 * action pills share the same shape, position, and motion.
 */
export function EditModeToggle({
  onClick,
  className,
  label,
  showShortcut = true,
}: Props) {
  const t = useT()
  return (
    <FloatingActionPill
      icon={Pencil}
      label={label ?? t.actions.edit}
      onClick={onClick}
      shortcut={showShortcut ? "⌘E" : undefined}
      className={className}
    />
  )
}
