import { getPublishedAnnouncementByParam, getPublishedAnnouncementSlugs } from "@/app/[locale]/announcement/data";
import { extractFirstImage } from "@/lib/ui/article";
import { renderArticle } from "@/lib/ui/rich-text";
import { estimateReadingTime } from "@/lib/ui/reading-time";
import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/site";
import { defaultLocale, isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { localeAlternates } from "@/lib/i18n/seo";
import { localizedPath } from "@/lib/i18n/routing";
import { isUuid } from "@/lib/slug";
import { permanentRedirect } from "next/navigation";
import { AnnouncementArticleClient } from "./article-client";
import { AnnouncementDraftFallback } from "./draft-fallback";

// Next.js decodes the `[id]` segment for generateMetadata's `params` but NOT
// for the page component's `params` on this route (observed on Next 16 /
// Turbopack dev + build for any non-ASCII generateStaticParams value —
// slugs are CJK by default). Decode defensively everywhere; slugs can never
// contain a literal "%" (stripped as URL-hostile in lib/slug.ts), so
// decoding an already-decoded string is always a safe no-op.
function decodeParam(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export async function generateStaticParams() {
  const slugs = await getPublishedAnnouncementSlugs();
  return slugs.map((slug) => ({ id: slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale: raw, id: rawId } = await params;
  const id = decodeParam(rawId);
  const locale: Locale = isLocale(raw) ? raw : defaultLocale;
  const dict = await getDictionary(locale);
  const announcement = await getPublishedAnnouncementByParam(id);
  const title = announcement?.title ?? dict.announcement.meta.fallbackTitle;
  const description = announcement?.category
    ? dict.announcement.meta.detailDescription
        .replace("{category}", announcement.category)
        .replace("{title}", title)
    : dict.announcement.meta.detailDescriptionFallback.replace("{title}", title);
  const inlineImage = announcement
    ? extractFirstImage(announcement.content as Record<string, unknown> | null)
    : null;
  const ogImages = inlineImage
    ? [{ url: inlineImage, width: 1200, height: 630, alt: title }]
    : [{ url: "/og.png", width: 1200, height: 630, alt: title }];
  const twitterImages = ogImages.map((i) => i.url);
  // Canonical always points at the slug URL, even when this render was
  // reached via a legacy UUID link.
  const canonicalId = announcement?.slug ?? id;
  const a = localeAlternates(`/announcement/${encodeURIComponent(canonicalId)}`, locale);
  return {
    title: `${title}${dict.common.titleSuffix}`,
    description,
    alternates: { canonical: a.canonical, languages: a.languages },
    // Next.js App Router performs object-level replace (not deep merge) when a
    // child segment exports openGraph. All required fields must be declared here
    // explicitly; relying on layout.tsx inheritance silently drops og:type /
    // og:site_name / og:locale.
    openGraph: {
      type: "article",
      siteName: SITE_NAME,
      locale: "zh_TW",
      title: `${title}${dict.common.titleSuffix}`,
      description,
      url: `/announcement/${encodeURIComponent(canonicalId)}`,
      images: ogImages,
    },
    twitter: {
      card: "summary_large_image",
      title: `${title}${dict.common.titleSuffix}`,
      description,
      images: twitterImages,
    },
  };
}

export default async function AnnouncementDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: raw, id: rawId } = await params;
  const id = decodeParam(rawId);
  const locale: Locale = isLocale(raw) ? raw : defaultLocale;
  const announcement = await getPublishedAnnouncementByParam(id);

  if (!announcement) {
    return <AnnouncementDraftFallback id={id} />;
  }

  // Legacy `/announcement/[uuid]` link that resolved by id — send visitors
  // (and search engines) forward to the canonical slug URL permanently.
  if (isUuid(id) && announcement.slug !== id) {
    permanentRedirect(
      localizedPath(`/announcement/${encodeURIComponent(announcement.slug)}`, locale),
    );
  }

  const { html, toc } = renderArticle(announcement.content);
  const { minutes: readingTimeMin } = estimateReadingTime(announcement.content);

  return (
    <AnnouncementArticleClient
      initialAnnouncement={announcement}
      initialContentHtml={html}
      initialToc={toc}
      readingTimeMin={readingTimeMin}
    />
  );
}
