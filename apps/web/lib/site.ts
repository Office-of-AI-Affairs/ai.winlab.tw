/**
 * Canonical bilingual site identity — single source of truth for the
 * wordmark, `<title>`, OpenGraph `siteName`, OG image `alt`, and JSON-LD.
 *
 * Chinese is the primary language; English is carried alongside so the site
 * has a discoverable English name (browser tabs, social shares, search
 * results, structured data). These are static strings with zero runtime
 * cost — they don't touch the ISR/SSG/cookieless architecture.
 */

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
