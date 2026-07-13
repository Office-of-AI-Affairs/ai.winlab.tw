import type { Locale } from "./config";

/**
 * Pick the locale-appropriate value for a bilingual DB field.
 *
 * Content tables carry a nullable English column alongside the canonical zh-TW
 * one (e.g. `title` + `title_en`). On `/en` we use the English value when it is
 * present, otherwise fall back to the zh-TW value. `isFallback` lets callers
 * signal the mixed-language state — render the fallback inside `lang="zh-Hant"`
 * and show the `i18nNotice.untranslated` notice.
 *
 * The default locale always returns the base value with `isFallback: false`.
 */
export function localizedField<T extends Record<string, unknown>, K extends keyof T & string>(
  row: T,
  base: K,
  locale: Locale,
): { value: T[K]; isFallback: boolean } {
  if (locale !== "en") return { value: row[base], isFallback: false };

  const en = (row as Record<string, unknown>)[`${base}_en`];
  const hasEn = en != null && (typeof en !== "string" || en.trim() !== "");

  return hasEn
    ? { value: en as T[K], isFallback: false }
    : { value: row[base], isFallback: true };
}
