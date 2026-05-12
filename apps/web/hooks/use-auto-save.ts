"use client";

import { useCallback, useEffect, useRef } from "react";

interface UseAutoSaveOptions {
  /** Whether there are unsaved changes */
  hasChanges: boolean;
  /** The save function to call */
  onSave: () => Promise<void>;
  /** Debounce delay in ms (default: 3000) */
  delay?: number;
  /** Enable/disable auto-save (default: true) */
  enabled?: boolean;
}

export function useAutoSave({
  hasChanges,
  onSave,
  delay = 3000,
  enabled = true,
}: UseAutoSaveOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSaveRef = useRef(onSave);
  const isSavingRef = useRef(false);
  const hasChangesRef = useRef(hasChanges);

  useEffect(() => {
    hasChangesRef.current = hasChanges;
  }, [hasChanges]);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!enabled || !hasChanges) {
      cancel();
      return;
    }

    timerRef.current = setTimeout(async () => {
      if (isSavingRef.current) return;
      isSavingRef.current = true;
      try {
        await onSaveRef.current();
      } finally {
        isSavingRef.current = false;
      }
    }, delay);

    return cancel;
  }, [hasChanges, enabled, delay, cancel]);

  useEffect(() => {
    if (!hasChanges) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasChanges]);

  const guardNavigation = useCallback((navigate: () => void) => {
    if (hasChangesRef.current) {
      if (!window.confirm("你有尚未儲存的變更，確定要離開嗎？")) return;
    }
    navigate();
  }, []);

  return { guardNavigation };
}
