import { getPublishedArticle, getPublishedArticleIds } from "@/app/insights/data";
import { extractFirstImage } from "@/lib/ui/article";
import { renderArticle } from "@/lib/ui/rich-text";
import { estimateReadingTime } from "@/lib/ui/reading-time";
import type { Metadata } from "next";
import { InsightArticleClient } from "./article-client";
import { InsightDraftFallback } from "./draft-fallback";

export async function generateStaticParams() {
  const ids = await getPublishedArticleIds();
  return ids.map((id) => ({ id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const article = await getPublishedArticle(id);
  const title = article?.title ?? "觀點";
  const description = article?.summary
    ?? `${title}｜國立陽明交通大學人工智慧專責辦公室觀點分享`;
  const coverImage = article?.cover_image_url
    ?? (article ? extractFirstImage(article.content as Record<string, unknown> | null) : null);
  const ogImages = coverImage
    ? [{ url: coverImage, width: 1200, height: 630, alt: title }]
    : [{ url: "/og.png", width: 1200, height: 630, alt: title }];
  return {
    title: `${title}｜人工智慧專責辦公室`,
    description,
    alternates: { canonical: `/insights/${id}` },
    openGraph: {
      title: `${title}｜人工智慧專責辦公室`,
      description,
      url: `/insights/${id}`,
      images: ogImages,
    },
    twitter: {
      card: "summary_large_image",
      title: `${title}｜人工智慧專責辦公室`,
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
