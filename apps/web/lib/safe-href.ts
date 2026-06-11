// Guards user-supplied link targets before they reach an <a>/<AppLink> href.
// Only http(s) URLs are renderable; anything else (javascript:, data:,
// vbscript:, …) returns null so callers can drop the link instead of
// emitting a clickable XSS sink. mailto:/tel: targets are built separately
// from dedicated fields, never from these free-form URL inputs.
export function safeHref(url: string): string | null {
  const trimmed = url.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : null;
}
