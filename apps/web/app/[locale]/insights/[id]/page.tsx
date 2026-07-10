import { getPublishedArticle, getPublishedArticleIds } from "@/app/[locale]/insights/data";
import { extractFirstImage } from "@/lib/ui/article";
import { renderArticle } from "@/lib/ui/rich-text";
import { estimateReadingTime } from "@/lib/ui/reading-time";
import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/site";
import { defaultLocale, isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { localeAlternates } from "@/lib/i18n/seo";
import { InsightArticleClient } from "./article-client";
import { InsightDraftFallback } from "./draft-fallback";

export async function generateStaticParams() {
  const ids = await getPublishedArticleIds();
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
  const article = await getPublishedArticle(id);
  const title = article?.title ?? dict.insights.meta.fallbackTitle;
  const description = article?.summary
    ?? dict.insights.meta.detailDescriptionFallback.replace("{title}", title);
  const coverImage = article?.cover_image_url
    ?? (article ? extractFirstImage(article.content as Record<string, unknown> | null) : null);
  const ogImages = coverImage
    ? [{ url: coverImage, width: 1200, height: 630, alt: title }]
    : [{ url: "/og.png", width: 1200, height: 630, alt: title }];
  const a = localeAlternates(`/insights/${id}`, locale);
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
      url: `/insights/${id}`,
      images: ogImages,
    },
    twitter: {
      card: "summary_large_image",
      title: `${title}${dict.common.titleSuffix}`,
      description,
      images: ogImages.map((i) => i.url),
    },
  };
}

export default async function InsightDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const article = await getPublishedArticle(id);

  if (!article) {
    return <InsightDraftFallback id={id} />;
  }

  const { html, toc } = renderArticle(article.content);
  const { minutes: readingTimeMin } = estimateReadingTime(article.content);

  return (
    <InsightArticleClient
      initialArticle={article}
      initialContentHtml={html}
      initialToc={toc}
      readingTimeMin={readingTimeMin}
    />
  );
}
