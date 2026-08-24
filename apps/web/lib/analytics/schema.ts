import { stripLocalePrefix } from "@/lib/i18n/routing";

/**
 * Pure payload validator/normalizer for `/api/beacon` (see route.ts) — no
 * request/header access here so it's trivially unit-testable and safely
 * importable from the client beacon component too (it needs the same
 * `isExcludedPath` guard before it ever calls `sendBeacon`).
 *
 * Whitelist-only: unknown keys are simply never read, every known field is
 * type/range/length checked, and anything that fails validation is dropped
 * rather than causing the whole event (or request) to error.
 */

const MAX_PATH_LENGTH = 256;
const MAX_UTM_LENGTH = 64;
const MAX_LOCALE_LENGTH = 8;
const MAX_VIEWPORT_LENGTH = 16;
const MAX_RATING_LENGTH = 32;
const MAX_WEBVITAL_NAME_LENGTH = 8;

const KNOWN_LOCALES = new Set(["zh-TW", "en"]);
const VIEWPORTS = new Set(["mobile", "desktop"]);
const WEB_VITAL_NAMES = new Set(["LCP", "CLS", "INP", "FCP", "TTFB"]);
const WEB_VITAL_RATINGS = new Set(["good", "needs-improvement", "poor"]);

// Admin/edit surfaces — this is visitor analytics, never log these even if a
// stale client somehow still sends one (the client-side guard is the primary
// filter; this is defense in depth).
const ADMIN_ROUTE_PREFIXES = ["/settings", "/login"];

export type PageviewEvent = {
  type: "pageview";
  path: string;
  referrerOrigin?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  locale?: string;
  viewport?: "mobile" | "desktop";
};

export type WebVitalEvent = {
  type: "webvital";
  name: "LCP" | "CLS" | "INP" | "FCP" | "TTFB";
  value: number;
  rating?: "good" | "needs-improvement" | "poor";
  path: string;
};

export type BeaconEvent = PageviewEvent | WebVitalEvent;

function clampString(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, maxLength);
}

/** Path-only — strips query and hash. Accepts either a bare path or a full
 *  URL (the base is a throwaway, only used to get `URL` parsing for free). */
function normalizePath(raw: unknown): string | undefined {
  const value = clampString(raw, 2048);
  if (!value) return undefined;
  try {
    const url = new URL(value, "https://ai.winlab.tw");
    return (url.pathname || "/").slice(0, MAX_PATH_LENGTH);
  } catch {
    return undefined;
  }
}

/** Origin only — never forward the referrer's path/query, that's the
 *  previous page's identity, not ours to log. */
function normalizeReferrerOrigin(raw: unknown): string | undefined {
  const value = clampString(raw, 2048);
  if (!value) return undefined;
  try {
    return new URL(value).origin;
  } catch {
    return undefined;
  }
}

/** True for admin/edit surfaces this beacon must never report on
 *  (`/settings`, `/login`, `?mode=edit`), locale-prefix aware. `search` is
 *  optional because by the time a payload reaches the server its `path` has
 *  already had the query string stripped — only the client-side caller (who
 *  still has the full URL) can check the `?mode=edit` case. */
export function isExcludedPath(pathname: string, search?: string): boolean {
  const bare = stripLocalePrefix(pathname || "/");
  if (ADMIN_ROUTE_PREFIXES.some((prefix) => bare === prefix || bare.startsWith(`${prefix}/`))) {
    return true;
  }
  if (search) {
    const params = new URLSearchParams(search);
    if (params.get("mode") === "edit") return true;
  }
  return false;
}

function normalizePageview(input: Record<string, unknown>): PageviewEvent | null {
  const path = normalizePath(input.path);
  if (!path || isExcludedPath(path)) return null;

  const event: PageviewEvent = { type: "pageview", path };

  const referrerOrigin = normalizeReferrerOrigin(input.referrer);
  if (referrerOrigin) event.referrerOrigin = referrerOrigin;

  const utmSource = clampString(input.utm_source, MAX_UTM_LENGTH);
  if (utmSource) event.utmSource = utmSource;

  const utmMedium = clampString(input.utm_medium, MAX_UTM_LENGTH);
  if (utmMedium) event.utmMedium = utmMedium;

  const utmCampaign = clampString(input.utm_campaign, MAX_UTM_LENGTH);
  if (utmCampaign) event.utmCampaign = utmCampaign;

  const locale = clampString(input.locale, MAX_LOCALE_LENGTH);
  if (locale && KNOWN_LOCALES.has(locale)) event.locale = locale;

  const viewport = clampString(input.viewport, MAX_VIEWPORT_LENGTH);
  if (viewport && VIEWPORTS.has(viewport)) event.viewport = viewport as "mobile" | "desktop";

  return event;
}

function normalizeWebVital(input: Record<string, unknown>): WebVitalEvent | null {
  const name = clampString(input.name, MAX_WEBVITAL_NAME_LENGTH);
  if (!name || !WEB_VITAL_NAMES.has(name)) return null;

  const rawValue = input.value;
  if (typeof rawValue !== "number" || !Number.isFinite(rawValue) || rawValue < 0) return null;
  const value = Math.min(rawValue, 1_000_000);

  const path = normalizePath(input.path);
  if (!path) return null;

  const event: WebVitalEvent = {
    type: "webvital",
    name: name as WebVitalEvent["name"],
    value,
    path,
  };

  const rating = clampString(input.rating, MAX_RATING_LENGTH);
  if (rating && WEB_VITAL_RATINGS.has(rating)) {
    event.rating = rating as WebVitalEvent["rating"];
  }

  return event;
}

/** Entry point: `unknown` JSON body in, a known-shape event out (or `null`
 *  to silently drop). Never throws. */
export function normalizeBeaconEvent(raw: unknown): BeaconEvent | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const input = raw as Record<string, unknown>;

  if (input.type === "pageview") return normalizePageview(input);
  if (input.type === "webvital") return normalizeWebVital(input);
  return null;
}
