import type {
  ApplicationMethod,
  ApplicationMethodLink,
} from "@winlab/db"

import { safeHref } from "@/lib/safe-href"

/**
 * Stable zh-TW labels used when promoting legacy URL fields into named links.
 * Stored / synthesized values stay in Chinese so identity is locale-independent;
 * call {@link localizeApplicationLinkLabel} at the UI boundary.
 */
export const LEGACY_APPLICATION_LINK_LABEL = "網站"
export const LEGACY_RECRUITMENT_LINK_LABEL = "官方網站"

export type ApplicationLinkLabelDict = {
  applicationWebsite: string
  recruitmentWebsite: string
}

function trimOptional(value?: string): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

/**
 * Map known system-generated link labels to the current locale.
 * User-authored labels (e.g. "104", "Facebook") pass through unchanged.
 */
export function localizeApplicationLinkLabel(
  label: string,
  dict: ApplicationLinkLabelDict,
): string {
  if (label === LEGACY_RECRUITMENT_LINK_LABEL) return dict.recruitmentWebsite
  if (label === LEGACY_APPLICATION_LINK_LABEL) return dict.applicationWebsite
  return label
}

export function getApplicationMethodLinks(
  applicationMethod: ApplicationMethod | null | undefined,
  legacyRecruitmentLink?: string | null
): ApplicationMethodLink[] {
  const links = (applicationMethod?.links ?? [])
    .map((link) => sanitizeLink(link))
    .filter((link) => link.label && link.url)

  const legacyApplicationUrl = trimOptional(applicationMethod?.url)
  if (legacyApplicationUrl && !links.some((link) => link.url === legacyApplicationUrl)) {
    links.push({ label: LEGACY_APPLICATION_LINK_LABEL, url: legacyApplicationUrl })
  }

  const legacyRecruitmentUrl = trimOptional(legacyRecruitmentLink ?? undefined)
  if (legacyRecruitmentUrl && !links.some((link) => link.url === legacyRecruitmentUrl)) {
    links.push({ label: LEGACY_RECRUITMENT_LINK_LABEL, url: legacyRecruitmentUrl })
  }

  return links
}

export function normalizeApplicationMethod(
  applicationMethod: ApplicationMethod | null | undefined,
  legacyRecruitmentLink?: string | null
): ApplicationMethod | null {
  if (!applicationMethod && !trimOptional(legacyRecruitmentLink ?? undefined)) {
    return null
  }

  const email = trimOptional(applicationMethod?.email)
  const other = trimOptional(applicationMethod?.other)
  const links = getApplicationMethodLinks(applicationMethod, legacyRecruitmentLink)

  if (!email && !other && links.length === 0) {
    return null
  }

  return {
    ...(email ? { email } : {}),
    ...(links.length > 0 ? { links } : {}),
    ...(other ? { other } : {}),
  }
}

function sanitizeLink(link: ApplicationMethodLink): ApplicationMethodLink {
  // Drop non-http(s) URLs (javascript:, data:, …) to "" so the downstream
  // `link.label && link.url` filter removes them before they reach an href.
  return {
    label: link.label.trim(),
    url: safeHref(link.url) ?? "",
  }
}
