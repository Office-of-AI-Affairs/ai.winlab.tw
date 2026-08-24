"use client";

import { Search } from "lucide-react";

import { useSearchPalette } from "@/components/layout/search-provider";
import { useT } from "@/lib/i18n/locale-provider";

/** Header search entry point — opens the shared cmd/ctrl-K palette.
 *  `onBeforeOpen` lets the mobile menu close itself first. */
export function SearchTriggerButton({
  className,
  onBeforeOpen,
}: {
  className?: string;
  onBeforeOpen?: () => void;
}) {
  const t = useT();
  const { setOpen } = useSearchPalette();

  return (
    <button
      type="button"
      onClick={() => {
        onBeforeOpen?.();
        setOpen(true);
      }}
      aria-label={t.search.openLabel}
      className={className ?? "interactive-scale inline-flex items-center gap-1.5 rounded-lg p-2 hover:bg-black/10"}
    >
      <Search className="size-5" aria-hidden />
      <span className="sr-only">{t.search.openLabel}</span>
    </button>
  );
}
