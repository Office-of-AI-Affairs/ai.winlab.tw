/**
 * i18n configuration — single source of truth for the supported locales.
 *
 * Chinese (`zh-TW`) is the default and stays un-prefixed at `/`; English is
 * served under `/en/*`. See `middleware.ts` for how the default locale is
 * rewritten and `components/app-link.tsx` for how links are prefixed.
 */

export const locales = ["zh-TW", "en"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "zh-TW";

/** URL prefix for a locale — the default locale is un-prefixed. */
export function localePrefix(locale: Locale): string {
  return locale === defaultLocale ? "" : `/${locale}`;
}

export function isLocale(value: string | undefined | null): value is Locale {
  return value != null && (locales as readonly string[]).includes(value);
}
