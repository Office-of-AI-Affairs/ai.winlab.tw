"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { locales, type Locale } from "@/lib/i18n/config";
import { useLocale, useT } from "@/lib/i18n/locale-provider";
import { switchLocalePath } from "@/lib/i18n/routing";
import { cn } from "@/lib/utils";

// 各語言以自身文字標示（i18n 慣例）。
const NATIVE_NAME: Record<Locale, string> = {
  "zh-TW": "中文",
  en: "English",
};

/**
 * Compact secondary language switch for the footer. Mirrors the header
 * `LanguageToggle` behavior (preserve current path via `switchLocalePath`) but
 * uses the footer's muted-link styling instead of the blue-bar treatment.
 */
export function FooterLanguageSwitch() {
  const active = useLocale();
  const t = useT();
  const pathname = usePathname();

  return (
    <span
      role="group"
      aria-label={t.nav.languageLabel}
      className="inline-flex items-center gap-2 text-sm"
    >
      {locales.map((l) => {
        const isActive = l === active;
        return (
          <Link
            key={l}
            href={switchLocalePath(pathname, l)}
            hrefLang={l}
            lang={l}
            aria-current={isActive ? "true" : undefined}
            className={cn(
              "transition-colors",
              isActive
                ? "text-foreground font-medium"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {NATIVE_NAME[l]}
          </Link>
        );
      })}
    </span>
  );
}
