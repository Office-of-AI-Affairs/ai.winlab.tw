"use client";

import { createContext, useContext, useEffect, useState } from "react";

import { SiteSearchCommand } from "@/components/search/site-search-command";

type SearchContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const SearchContext = createContext<SearchContextValue | null>(null);

/**
 * Owns the cmd/ctrl-K palette's open state and the global keyboard shortcut,
 * so both the header's search button and the shortcut toggle the same
 * dialog. Mounted once in the root layout, next to `AuthProvider` — search
 * needs `LocaleProvider` (for `useT`/`useLocale`) but not auth.
 */
export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const isShortcut = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k";
      if (!isShortcut) return;
      e.preventDefault();
      setOpen((prev) => !prev);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <SearchContext.Provider value={{ open, setOpen }}>
      {children}
      <SiteSearchCommand open={open} onOpenChange={setOpen} />
    </SearchContext.Provider>
  );
}

/** Read/toggle the shared search-palette state (header button, etc.). */
export function useSearchPalette(): SearchContextValue {
  const ctx = useContext(SearchContext);
  if (!ctx) {
    throw new Error("useSearchPalette must be used within SearchProvider");
  }
  return ctx;
}
