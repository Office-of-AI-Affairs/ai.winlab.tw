import type {
  ApplicationMethod,
  ApplicationMethodLink,
} from "@/lib/supabase/types"

const LEGACY_APPLICATION_LINK_LABEL = "網站"
const LEGACY_RECRUITMENT_LINK_LABEL = "官方網站"

function trimOptional(value?: string): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
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
  return {
    label: link.label.trim(),
    url: link.url.trim(),
  }
}
