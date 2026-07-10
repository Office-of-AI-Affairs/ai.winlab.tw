import { defaultLocale, isLocale, localePrefix, type Locale } from "./config";

/**
 * Locale-aware path helpers. The default locale (`zh-TW`) is un-prefixed, so
 * these only ever add/strip the `/en` prefix. Safe in both Server and Client
 * Components (no server-only imports).
 */

/** Prefix an internal absolute path (`/foo`) for the given locale. Leaves
 *  external URLs, `mailto:`/`tel:`, hashes, and relative paths untouched. */
export function localizedPath(path: string, locale: Locale): string {
  if (!path.startsWith("/")) return path;
  const prefix = localePrefix(locale);
  if (!prefix) return path;
  if (path === prefix || path.startsWith(`${prefix}/`)) return path;
  return `${prefix}${path}`;
}

/** The locale encoded in a browser pathname; bare paths are the default. */
export function localeFromPathname(pathname: string): Locale {
  const seg = pathname.split("/")[1];
  return isLocale(seg) ? seg : defaultLocale;
}

/** Strip a leading non-default locale prefix, returning the bare path. */
export function stripLocalePrefix(pathname: string): string {
  const seg = pathname.split("/")[1];
  if (isLocale(seg) && seg !== defaultLocale) {
    const rest = pathname.slice(`/${seg}`.length);
    return rest === "" ? "/" : rest;
  }
  return pathname || "/";
}

/** Rewrite the current pathname to another locale (for the switcher). */
export function switchLocalePath(pathname: string, target: Locale): string {
  return localizedPath(stripLocalePrefix(pathname), target);
}
