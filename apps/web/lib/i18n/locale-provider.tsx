"use client";

import { createContext, useContext } from "react";

import { defaultLocale, type Locale } from "./config";
import type { Dictionary } from "./dictionary";

// Seeded once per render by the root `app/[locale]/layout.tsx` (a Server
// Component that loads the dictionary), so Client Components can translate and
// build locale-aware links without a server round-trip. The value is known at
// build time per locale, so it doesn't break static generation.
type LocaleContextValue = { locale: Locale; dict: Dictionary };

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
  locale,
  dict,
  children,
}: {
  locale: Locale;
  dict: Dictionary;
  children: React.ReactNode;
}) {
  return (
    <LocaleContext.Provider value={{ locale, dict }}>
      {children}
    </LocaleContext.Provider>
  );
}

/** Current locale. Falls back to the default when no provider is mounted
 *  (e.g. the root error boundary), so link-prefixing degrades gracefully. */
export function useLocale(): Locale {
  return useContext(LocaleContext)?.locale ?? defaultLocale;
}

/** The active dictionary. Throws if used outside `LocaleProvider`. */
export function useT(): Dictionary {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useT must be used within a LocaleProvider");
  }
  return ctx.dict;
}
