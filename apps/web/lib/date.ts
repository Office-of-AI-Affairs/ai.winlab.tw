import { defaultLocale, type Locale } from "@/lib/i18n/config"

const INTL_LOCALE: Record<Locale, string> = {
  "zh-TW": "zh-TW",
  en: "en-US",
}

const OPTIONS: Record<"short" | "long", Intl.DateTimeFormatOptions> = {
  short: { timeZone: "Asia/Taipei", year: "numeric", month: "2-digit", day: "2-digit" },
  long: { timeZone: "Asia/Taipei", year: "numeric", month: "long", day: "numeric" },
}

const cache = new Map<string, Intl.DateTimeFormat>()

function getFormatter(locale: Locale, style: "short" | "long") {
  const key = `${locale}:${style}`
  let fmt = cache.get(key)
  if (!fmt) {
    fmt = new Intl.DateTimeFormat(INTL_LOCALE[locale], OPTIONS[style])
    cache.set(key, fmt)
  }
  return fmt
}

export function formatDate(
  value: string | number | Date,
  style: "short" | "long" = "short",
  locale: Locale = defaultLocale
) {
  return getFormatter(locale, style).format(new Date(value))
}
