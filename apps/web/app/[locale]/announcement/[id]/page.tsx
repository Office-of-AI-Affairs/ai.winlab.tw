import { getPublishedAnnouncement, getPublishedAnnouncementIds } from "@/app/[locale]/announcement/data";
import { extractFirstImage } from "@/lib/ui/article";
import { renderArticle } from "@/lib/ui/rich-text";
import { estimateReadingTime } from "@/lib/ui/reading-time";
import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/site";
import { defaultLocale, isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { localeAlternates } from "@/lib/i18n/seo";
import { AnnouncementArticleClient } from "./article-client";
import { AnnouncementDraftFallback } from "./draft-fallback";

export async function generateStaticParams() {
  const ids = await getPublishedAnnouncementIds();
  return ids.map((id) => ({ id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale: raw, id } = await params;
  const locale: Locale = isLocale(raw) ? raw : defaultLocale;
  const dict = await getDictionary(locale);
  const announcement = await getPublishedAnnouncement(id);
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
  const a = localeAlternates(`/announcement/${id}`, locale);
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
      url: `/announcement/${id}`,
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
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const announcement = await getPublishedAnnouncement(id);

  if (!announcement) {
    return <AnnouncementDraftFallback id={id} />;
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
