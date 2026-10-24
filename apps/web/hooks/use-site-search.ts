"use client";

import { useEffect, useRef, useState } from "react";

import { isSearchQueryValid, normalizeSearchQuery } from "@/lib/search/query";
import type { Locale } from "@/lib/i18n/config";
import type { SearchResultRow } from "@/lib/search/types";

const DEBOUNCE_MS = 250;

/**
 * Debounced `search_site()` call for the cmd/ctrl-K palette, through
 * GET /api/search.
 */
export function useSiteSearch(rawQuery: string, locale: Locale) {
  const [results, setResults] = useState<SearchResultRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const query = normalizeSearchQuery(rawQuery);

    // An invalid (too-short/empty) query never reaches the network — the
    // caller already gates rendering on `isSearchQueryValid(rawQuery)`
    // itself, so stale `results`/`isLoading` from a previous valid query
    // are simply never shown; nothing to reset here.
    if (!isSearchQueryValid(query)) return;

    const requestId = ++requestIdRef.current;
    // The loading/error resets live inside the timer callback (not the
    // effect body) — both are debounce/network callbacks, the same
    // "external system" boundary as the `.then()` below, not a synchronous
    // derived-state update.
    const timer = setTimeout(() => {
      setIsLoading(true);
      setError(null);

      fetch(`/api/search?${new URLSearchParams({ q: query, locale })}`)
        .then(async (res) => {
          if (!res.ok) throw new Error(`search failed (${res.status})`);
          return (await res.json()) as SearchResultRow[];
        })
        .then(
          (rows) => {
            // A newer request already started — drop this stale response.
            if (requestId !== requestIdRef.current) return;
            setResults(rows);
            setIsLoading(false);
          },
          (err: Error) => {
            if (requestId !== requestIdRef.current) return;
            setError(err.message);
            setResults([]);
            setIsLoading(false);
          },
        );
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [rawQuery, locale]);

  return { results, isLoading, error };
}
