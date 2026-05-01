import { AnnouncementDetail } from "@/components/announcement-detail";
import { JsonLd } from "@/components/json-ld";
import { buildBreadcrumbJsonLd } from "@/lib/seo/breadcrumb";
import { createClient } from "@/lib/supabase/server";
import { renderArticle } from "@/lib/ui/rich-text";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}): Promise<Metadata> {
  const { slug, id } = await params;
  const supabase = await createClient();
  const [announcementRes, eventRes] = await Promise.all([
    supabase.from("announcements").select("title, category").eq("id", id).single(),
    supabase.from("events").select("cover_image, name").eq("slug", slug).single(),
  ]);
  const title = announcementRes.data?.title ?? "公告";
  const description = announcementRes.data?.category
    ? `${announcementRes.data.category}公告：${title}`
    : `${title}｜活動公告`;
  const ogImages = eventRes.data?.cover_image
    ? [{ url: eventRes.data.cover_image, width: 1200, height: 630, alt: title }]
    : [];
  const twitterImages = ogImages.length ? ogImages.map((i) => i.url) : ["/og.png"];
  return {
    title: `${title}｜人工智慧專責辦公室`,
    description,
    alternates: {
      canonical: `/events/${slug}/announcements/${id}`,
    },
    openGraph: {
      title: `${title}｜人工智慧專責辦公室`,
      description,
      url: `/events/${slug}/announcements/${id}`,
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

export default async function EventAnnouncementDetailPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const supabase = await createClient();

  const [announcementRes, eventRes] = await Promise.all([
    supabase
      .from("announcements")
      .select("*")
      .eq("id", id)
      .eq("status", "published")
      .single(),
    supabase.from("events").select("name").eq("slug", slug).single(),
  ]);

  if (announcementRes.error || !announcementRes.data) notFound();
  const announcement = announcementRes.data;
  const eventName = eventRes.data?.name ?? "活動";

  const { html, toc } = renderArticle(
    announcement.content as Record<string, unknown> | null,
  );
  const contentHtml = html ?? "<p>（無內容）</p>";

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: announcement.title,
    datePublished: announcement.date,
    dateModified: announcement.updated_at,
    articleSection: announcement.category,
    url: `https://ai.winlab.tw/events/${slug}/announcements/${id}`,
    publisher: {
      "@type": "Organization",
      name: "國立陽明交通大學 人工智慧專責辦公室",
      url: "https://ai.winlab.tw",
    },
  };

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "首頁", path: "/" },
    { name: "活動", path: "/events" },
    { name: eventName, path: `/events/${slug}` },
    { name: announcement.title, path: `/events/${slug}/announcements/${id}` },
  ]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <JsonLd data={structuredData} />
      <JsonLd data={breadcrumbJsonLd} />
      <Link
        href={`/events/${slug}?tab=announcements`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-10"
      >
        <ArrowLeft className="w-4 h-4" />
        返回活動
      </Link>

      <AnnouncementDetail
        title={announcement.title}
        date={announcement.date}
        category={announcement.category}
        contentHtml={contentHtml}
        toc={toc}
      />
    </div>
  );
}
