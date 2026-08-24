/**
 * Canonical bilingual site identity — single source of truth for the
 * wordmark, `<title>`, OpenGraph `siteName`, OG image `alt`, and JSON-LD.
 *
 * Chinese is the primary language; English is carried alongside so the site
 * has a discoverable English name (browser tabs, social shares, search
 * results, structured data). These are static strings with zero runtime
 * cost — they don't touch the ISR/SSG/cookieless architecture.
 */

/** Canonical absolute origin. Feed/sitemap builders need an absolute base;
 *  most call sites still inline the literal (see `app/sitemap.ts`,
 *  `lib/seo/jsonld.ts`) — this export exists for new code (feeds) that
 *  wants one, not a mandate to refactor the existing ones. */
export const SITE_URL = "https://ai.winlab.tw";

/** University name, English. NYCU is the university's established acronym. */
export const UNIVERSITY_NAME_EN = "National Yang Ming Chiao Tung University";

/** Office name, English — office-level only (no university prefix), matching
 *  the header wordmark and footer. */
export const OFFICE_NAME_EN = "Office of AI Affairs";

/** Full org name, Chinese — the existing canonical form. */
export const SITE_NAME_ZH = "國立陽明交通大學 人工智慧專責辦公室";

/** Full org name, English — compact form using the NYCU acronym. */
export const SITE_NAME_EN = "NYCU Office of AI Affairs";

/** Bilingual site identity for `<title>`, OG `siteName`, image `alt`,
 *  and JSON-LD. */
export const SITE_NAME = `${SITE_NAME_ZH}｜${SITE_NAME_EN}`;

/** Default site description, per locale (root layout fallback + home). */
export const SITE_DESCRIPTION_ZH =
  "國立陽明交通大學人工智慧專責辦公室網站，提供辦公室介紹、組織成員、公告、活動、成果與徵才資訊。";
export const SITE_DESCRIPTION_EN =
  "The website of NYCU's Office of AI Affairs — office introduction, team members, announcements, events, results, and recruitment.";

/**
 * `<title>` text for pages that identify the site itself (root layout
 * default, homepage) rather than a specific article. Declaring
 * `hreflang="en"` while serving the bilingual `zh｜en` string as the page
 * title is a misleading locale signal to search engines — zh-TW keeps the
 * existing bilingual title (it's the primary language and benefits from the
 * English name being discoverable there too), en gets the English name only.
 *
 * Avoid importing `Locale` here to keep this module import-cycle-free from
 * `lib/i18n/config`; callers pass the locale string directly.
 */
export function siteTitle(locale: "zh-TW" | "en"): string {
  return locale === "en" ? SITE_NAME_EN : SITE_NAME;
}

/**
 * Contact address for accessibility issue reports (`/accessibility`).
 * Matches the office's public contact (see the `contacts` table / homepage
 * contact card) rather than a dedicated inbox, since none exists yet.
 */
export const ACCESSIBILITY_CONTACT_EMAIL = "hsinyungchen@nycu.edu.tw";

/** Date the `/accessibility` statement was last reviewed (ISO, `YYYY-MM-DD`). */
export const ACCESSIBILITY_LAST_REVIEWED = "2026-08-24";
