import type {
  ApplicationMethod,
  ApplicationMethodLink,
} from "@/lib/supabase/types"

const LEGACY_LINK_LABEL = "網站"

function trimOptional(value?: string): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

export function getApplicationMethodLinks(
  applicationMethod: ApplicationMethod | null | undefined
): ApplicationMethodLink[] {
  if (!applicationMethod) {
    return []
  }

  const links = (applicationMethod.links ?? [])
    .map((link) => ({
      label: link.label.trim(),
      url: link.url.trim(),
    }))
    .filter((link) => link.label && link.url)

  if (links.length > 0) {
    return links
  }

  const legacyUrl = trimOptional(applicationMethod.url)
  return legacyUrl
    ? [{ label: LEGACY_LINK_LABEL, url: legacyUrl }]
    : []
}

export function normalizeApplicationMethod(
  applicationMethod: ApplicationMethod | null | undefined
): ApplicationMethod | null {
  if (!applicationMethod) {
    return null
  }

  const email = trimOptional(applicationMethod.email)
  const other = trimOptional(applicationMethod.other)
  const links = getApplicationMethodLinks(applicationMethod)

  if (!email && !other && links.length === 0) {
    return null
  }

  return {
    ...(email ? { email } : {}),
    ...(links.length > 0 ? { links } : {}),
    ...(other ? { other } : {}),
  }
}
