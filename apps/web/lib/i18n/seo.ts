import { defaultLocale, localePrefix, locales, type Locale } from "./config";

/** OpenGraph `locale` value (BCP-47 with underscore) for each locale. */
const OG_LOCALE: Record<Locale, string> = {
  "zh-TW": "zh_TW",
  en: "en_US",
};

export function ogLocale(locale: Locale): string {
  return OG_LOCALE[locale];
}

/** The other locales' OG values, for `openGraph.alternateLocale`. */
export function ogAlternateLocales(locale: Locale): string[] {
  return locales.filter((l) => l !== locale).map((l) => OG_LOCALE[l]);
}

/**
 * `alternates` for a public page's metadata, given the *bare* path (no locale
 * prefix, e.g. `/announcement` or `/`). Produces `canonical` for the current
 * locale plus `languages` hreflang entries for every locale + `x-default`.
 * Paths are relative and resolve against `metadataBase`.
 */
export function localeAlternates(barePath: string, locale: Locale) {
  const norm = barePath === "/" ? "" : barePath;
  const pathFor = (l: Locale) => `${localePrefix(l)}${norm}` || "/";
  return {
    canonical: pathFor(locale),
    languages: {
      "zh-TW": pathFor("zh-TW"),
      en: pathFor("en"),
      "x-default": pathFor(defaultLocale),
    },
  };
}
