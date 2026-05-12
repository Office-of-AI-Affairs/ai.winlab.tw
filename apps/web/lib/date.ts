const SHORT_DATE_FORMATTER = new Intl.DateTimeFormat("zh-TW", {
  timeZone: "Asia/Taipei",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})

const LONG_DATE_FORMATTER = new Intl.DateTimeFormat("zh-TW", {
  timeZone: "Asia/Taipei",
  year: "numeric",
  month: "long",
  day: "numeric",
})

export function formatDate(
  value: string | number | Date,
  style: "short" | "long" = "short"
) {
  return (style === "long" ? LONG_DATE_FORMATTER : SHORT_DATE_FORMATTER).format(
    new Date(value)
  )
}
