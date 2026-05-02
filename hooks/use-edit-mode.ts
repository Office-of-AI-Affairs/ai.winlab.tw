"use client"

import { parseAsStringLiteral, useQueryState } from "nuqs"
import { useCallback, useEffect } from "react"

const modeParser = parseAsStringLiteral(["view", "edit"] as const).withDefault("view")

type Options = {
  /** When false (e.g. viewer is not admin) `setMode` becomes a no-op and any stale `?mode=edit` URL state is cleared. */
  enabled?: boolean
  /** Listen for ⌘E / Ctrl-E to toggle. */
  enableShortcut?: boolean
}

/**
 * Drives the `?mode=view|edit` URL parameter that lets a single route
 * surface read and edit affordances on the same page. Clears the param
 * when the viewer is not allowed to edit so non-admin URLs stay clean.
 */
export function useEditMode({ enabled = true, enableShortcut = true }: Options = {}) {
  const [mode, setModeRaw] = useQueryState("mode", modeParser)

  const setMode = useCallback(
    (next: "view" | "edit") => {
      if (!enabled) return
      // Drop the param when going back to the default so URLs stay clean.
      void setModeRaw(next === "view" ? null : next)
    },
    [enabled, setModeRaw],
  )

  const toggle = useCallback(() => {
    if (!enabled) return
    void setModeRaw(mode === "edit" ? null : "edit")
  }, [enabled, mode, setModeRaw])

  useEffect(() => {
    if (enabled || mode !== "edit") return
    void setModeRaw(null)
  }, [enabled, mode, setModeRaw])

  useEffect(() => {
    if (!enabled || !enableShortcut) return
    const onKey = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey)) return
      if (event.key.toLowerCase() !== "e") return
      // Don't fight the browser's reload shortcut chord (Ctrl+Shift+E in some locales).
      if (event.shiftKey || event.altKey) return
      event.preventDefault()
      toggle()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [enabled, enableShortcut, toggle])

  return {
    mode: enabled ? mode : "view",
    isEditing: enabled && mode === "edit",
    setMode,
    toggle,
  }
}
