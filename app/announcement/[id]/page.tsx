import { AnnouncementDetail } from "@/components/announcement-detail";
import { JsonLd } from "@/components/json-ld";
import { ShareButtons } from "@/components/share-buttons";
import { getPublishedAnnouncement, getPublishedAnnouncementIds } from "@/app/announcement/data";
import { buildBreadcrumbJsonLd } from "@/lib/seo/breadcrumb";
import { extractFirstImage } from "@/lib/ui/article";
import { renderArticle } from "@/lib/ui/rich-text";
import { estimateReadingTime } from "@/lib/ui/reading-time";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

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

  if (!announcement) notFound();

  const { html, toc } = renderArticle(announcement.content);
  const contentHtml = html ?? "<p>（無內容）</p>";
  const { minutes: readingTimeMin } = estimateReadingTime(announcement.content);
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: announcement.title,
    datePublished: announcement.date,
    dateModified: announcement.updated_at,
    articleSection: announcement.category,
    url: `https://ai.winlab.tw/announcement/${announcement.id}`,
    publisher: {
      "@type": "Organization",
      name: "國立陽明交通大學 人工智慧專責辦公室",
      url: "https://ai.winlab.tw",
    },
  };

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "首頁", path: "/" },
    { name: "公告", path: "/announcement" },
    { name: announcement.title, path: `/announcement/${announcement.id}` },
  ]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <JsonLd data={structuredData} />
      <JsonLd data={breadcrumbJsonLd} />
      <div className="flex items-center justify-between gap-4 mb-10">
        <Link
          href="/announcement"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          返回列表
        </Link>
        <ShareButtons url={`/announcement/${id}`} title={announcement.title} />
      </div>

      <AnnouncementDetail
        title={announcement.title}
        date={announcement.date}
        category={announcement.category}
        contentHtml={contentHtml}
        toc={toc}
        readingTimeMin={readingTimeMin}
      />
    </div>
  );
}
