import { getPublishedAnnouncement, getPublishedAnnouncementIds } from "@/app/announcement/data";
import { extractFirstImage } from "@/lib/ui/article";
import { renderArticle } from "@/lib/ui/rich-text";
import { estimateReadingTime } from "@/lib/ui/reading-time";
import type { Metadata } from "next";
import { AnnouncementArticleClient } from "./article-client";
import { AnnouncementDraftFallback } from "./draft-fallback";

export async function generateStaticParams() {
  const ids = await getPublishedAnnouncementIds();
  return ids.map((id) => ({ id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const announcement = await getPublishedAnnouncement(id);
  const title = announcement?.title ?? "公告";
  const description = announcement?.category
    ? `${announcement.category}公告：${title}`
    : `${title}｜國立陽明交通大學人工智慧專責辦公室公告`;
  const inlineImage = announcement
    ? extractFirstImage(announcement.content as Record<string, unknown> | null)
    : null;
  const ogImages = inlineImage
    ? [{ url: inlineImage, width: 1200, height: 630, alt: title }]
    : [{ url: "/og.png", width: 1200, height: 630, alt: title }];
  const twitterImages = ogImages.map((i) => i.url);
  return {
    title: `${title}｜人工智慧專責辦公室`,
    description,
    alternates: { canonical: `/announcement/${id}` },
    openGraph: {
      title: `${title}｜人工智慧專責辦公室`,
      description,
      url: `/announcement/${id}`,
      images: ogImages,
    },
    twitter: {
      card: "summary_large_image",
      title: `${title}｜人工智慧專責辦公室`,
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
