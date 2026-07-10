"use client";

import { Globe } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { locales, type Locale } from "@/lib/i18n/config";
import { useLocale } from "@/lib/i18n/locale-provider";
import { switchLocalePath } from "@/lib/i18n/routing";
import { cn } from "@/lib/utils";

// Each language is labeled in its OWN script — the standard i18n convention
// (a reader recognizes their language by its native name regardless of the
// page's current language).
const NATIVE_NAME: Record<Locale, string> = {
  "zh-TW": "中文",
  en: "English",
};

/**
 * Segmented language switcher for the header (blue bar). Two locales, so a
 * one-tap segmented control reads clearer than a dropdown; the active segment
 * is filled. Renders on the `bg-nycu` surface, hence the white-on-blue styling
 * rather than semantic tokens.
 */
export function LanguageToggle({
  onNavigate,
  className,
}: {
  onNavigate?: () => void;
  className?: string;
}) {
  const active = useLocale();
  const pathname = usePathname();

  return (
    <div
      role="group"
      aria-label="語言 / Language"
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full border border-white/25 bg-white/5 p-0.5",
        className
      )}
    >
      <Globe className="ml-1.5 mr-0.5 h-3.5 w-3.5 shrink-0 text-white/55" aria-hidden />
      {locales.map((l) => {
        const isActive = l === active;
        return (
          <Link
            key={l}
            href={switchLocalePath(pathname, l)}
            hrefLang={l}
            aria-current={isActive ? "true" : undefined}
            onClick={onNavigate}
            className={cn(
              "interactive-scale rounded-full px-3 py-1 text-sm leading-none",
              isActive
                ? "bg-white text-nycu font-semibold"
                : "text-white/75 hover:bg-white/10 hover:text-white"
            )}
          >
            {NATIVE_NAME[l]}
          </Link>
        );
      })}
    </div>
  );
}
