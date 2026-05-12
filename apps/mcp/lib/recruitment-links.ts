import type { ApplicationMethod, ApplicationMethodLink } from "@/lib/supabase/types";

const LEGACY_APPLICATION_LINK_LABEL = "網站";

function trimOptional(value?: string | null): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function sanitizeLink(link: ApplicationMethodLink): ApplicationMethodLink {
  return {
    label: link.label.trim(),
    url: link.url.trim(),
  };
}

export function getApplicationMethodLinks(
  applicationMethod: ApplicationMethod | null | undefined,
): ApplicationMethodLink[] {
  const links = (applicationMethod?.links ?? [])
    .map((link) => sanitizeLink(link))
    .filter((link) => link.label && link.url);

  const legacyUrl = trimOptional(applicationMethod?.url);
  if (legacyUrl && !links.some((link) => link.url === legacyUrl)) {
    links.push({ label: LEGACY_APPLICATION_LINK_LABEL, url: legacyUrl });
  }

  return links;
}

export function normalizeApplicationMethod(
  applicationMethod: ApplicationMethod | null | undefined,
): ApplicationMethod | null {
  if (!applicationMethod) {
    return null;
  }

  const email = trimOptional(applicationMethod.email);
  const other = trimOptional(applicationMethod.other);
  const links = getApplicationMethodLinks(applicationMethod);

  if (!email && !other && links.length === 0) {
    return null;
  }

  return {
    ...(email ? { email } : {}),
    ...(links.length > 0 ? { links } : {}),
    ...(other ? { other } : {}),
  };
}

export function resolveRecruitmentLink(
  link: string | undefined,
  applicationMethod: ApplicationMethod | null,
): string {
  const explicitLink = trimOptional(link);
  if (explicitLink) {
    return explicitLink;
  }

  return getApplicationMethodLinks(applicationMethod)[0]?.url ?? "";
}
