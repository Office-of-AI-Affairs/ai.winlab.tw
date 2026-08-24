/**
 * Typed JSON-LD builders. Pair with the `<JsonLd>` component
 * (`components/json-ld.tsx`) which handles `<script>`-safe serialization —
 * these builders only produce the plain object, they don't render anything.
 *
 * `buildBreadcrumbJsonLd` lived in `./breadcrumb` first; re-exported here so
 * every structured-data builder is discoverable from one module.
 */

export { buildBreadcrumbJsonLd } from "./breadcrumb";

const BASE_URL = "https://ai.winlab.tw";

export type OrganizationJsonLdInput = {
  name: string;
  alternateName?: string;
  url?: string;
  description?: string;
  /** Absolute URL — schema.org's `logo` (and most consumers) reject relative paths. */
  logo?: string;
  contactPoint?: {
    email?: string;
    telephone?: string;
    contactType?: string;
  };
  /** Official social/profile URLs. Omit entirely rather than pass an empty array. */
  sameAs?: string[];
};

export function buildOrganizationJsonLd(input: OrganizationJsonLdInput): Record<string, unknown> {
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: input.name,
    url: input.url ?? BASE_URL,
  };
  if (input.alternateName) data.alternateName = input.alternateName;
  if (input.description) data.description = input.description;
  if (input.logo) data.logo = input.logo;
  if (input.contactPoint && (input.contactPoint.email || input.contactPoint.telephone)) {
    data.contactPoint = {
      "@type": "ContactPoint",
      ...(input.contactPoint.contactType ? { contactType: input.contactPoint.contactType } : {}),
      ...(input.contactPoint.email ? { email: input.contactPoint.email } : {}),
      ...(input.contactPoint.telephone ? { telephone: input.contactPoint.telephone } : {}),
    };
  }
  if (input.sameAs && input.sameAs.length > 0) data.sameAs = input.sameAs;
  return data;
}

export type NewsArticleJsonLdInput = {
  headline: string;
  datePublished: string;
  dateModified?: string;
  articleSection?: string | null;
  url: string;
  /** Absolute image URL, if the article has one. Omit rather than fake one. */
  image?: string | null;
  /** Defaults to the publisher when the content has no named author (the
   *  common case here — announcements are posted by the office, not a byline). */
  authorName?: string;
  authorUrl?: string;
  publisherName: string;
  publisherUrl?: string;
};

export function buildNewsArticleJsonLd(input: NewsArticleJsonLdInput): Record<string, unknown> {
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: input.headline,
    datePublished: input.datePublished,
    url: input.url,
    author: {
      "@type": "Organization",
      name: input.authorName ?? input.publisherName,
      ...(input.authorUrl ? { url: input.authorUrl } : {}),
    },
    publisher: {
      "@type": "Organization",
      name: input.publisherName,
      ...(input.publisherUrl ? { url: input.publisherUrl } : {}),
    },
  };
  if (input.dateModified) data.dateModified = input.dateModified;
  if (input.articleSection) data.articleSection = input.articleSection;
  if (input.image) data.image = input.image;
  return data;
}

export type EventJsonLdInput = {
  name: string;
  description: string;
  url: string;
  /** Only set these if the data model actually has dates — the `events`
   *  table doesn't today, so omit rather than fake a date. */
  startDate?: string | null;
  endDate?: string | null;
  organizerName: string;
  organizerUrl?: string;
};

export function buildEventJsonLd(input: EventJsonLdInput): Record<string, unknown> {
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: input.name,
    description: input.description,
    url: input.url,
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    organizer: {
      "@type": "Organization",
      name: input.organizerName,
      ...(input.organizerUrl ? { url: input.organizerUrl } : {}),
    },
  };
  if (input.startDate) data.startDate = input.startDate;
  if (input.endDate) data.endDate = input.endDate;
  return data;
}
