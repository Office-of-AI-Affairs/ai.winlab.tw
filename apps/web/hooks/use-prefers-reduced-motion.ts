"use client";

import { useEffect, useState } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

/**
 * SSR-safe `prefers-reduced-motion` read. Used to gate auto-advancing UI
 * (e.g. the home carousel autoplay plugin). The lazy initializer reads
 * the real value on the client's first render (no `window` on the
 * server, so SSR always initializes `false`); the effect only
 * subscribes to *future* changes, it never sets state synchronously
 * on mount itself.
 */
export function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(
    () => typeof window !== "undefined" && window.matchMedia(QUERY).matches,
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia(QUERY);
    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return prefersReducedMotion;
}
