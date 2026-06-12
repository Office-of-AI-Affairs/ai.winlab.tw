// Resolve the user-supplied `next` against our own origin and keep only the
// path/query/hash so the OAuth callback cannot be used as an open redirect.
export function safeNextPath(rawNext: string, origin: string): string {
  try {
    const resolved = new URL(rawNext, origin);
    if (resolved.origin !== origin) return "/";
    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch {
    return "/";
  }
}
