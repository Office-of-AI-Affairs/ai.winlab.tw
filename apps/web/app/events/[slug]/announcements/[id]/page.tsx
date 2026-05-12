import { createPublicClient } from "@/lib/supabase/public";
import type { Announcement } from "@/lib/supabase/types";
import { extractFirstImage } from "@/lib/ui/article";
import { renderArticle } from "@/lib/ui/rich-text";
import { estimateReadingTime } from "@/lib/ui/reading-time";
import type { Metadata } from "next";
import { EventAnnouncementArticleClient } from "./article-client";
import { EventAnnouncementDraftFallback } from "./draft-fallback";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}): Promise<Metadata> {
  const { slug, id } = await params;
  const supabase = createPublicClient();
  const [announcementRes, eventRes] = await Promise.all([
    supabase.from("announcements").select("title, category, content").eq("id", id).maybeSingle(),
    supabase.from("events").select("cover_image, name").eq("slug", slug).maybeSingle(),
  ]);
  const title = announcementRes.data?.title ?? "公告";
  const description = announcementRes.data?.category
    ? `${announcementRes.data.category}公告：${title}`
    : `${title}｜活動公告`;
  const inlineImage = announcementRes.data
    ? extractFirstImage(
        announcementRes.data.content as Record<string, unknown> | null,
      )
    : null;
  const ogImageUrl = inlineImage ?? eventRes.data?.cover_image ?? null;
  const ogImages = ogImageUrl
    ? [{ url: ogImageUrl, width: 1200, height: 630, alt: title }]
    : [];
  const twitterImages = ogImages.length ? ogImages.map((i) => i.url) : ["/og.png"];
  return {
    title: `${title}｜人工智慧專責辦公室`,
    description,
    alternates: { canonical: `/events/${slug}/announcements/${id}` },
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
  const supabase = createPublicClient();

  const [announcementRes, eventRes] = await Promise.all([
    supabase
      .from("announcements")
      .select("*")
      .eq("id", id)
      .eq("status", "published")
      .maybeSingle(),
    supabase.from("events").select("name").eq("slug", slug).maybeSingle(),
  ]);

  if (!announcementRes.data) {
    return <EventAnnouncementDraftFallback slug={slug} id={id} />;
  }

  const announcement = announcementRes.data as Announcement;
  const eventName = eventRes.data?.name ?? "活動";

  const { html, toc } = renderArticle(announcement.content);
  const { minutes: readingTimeMin } = estimateReadingTime(announcement.content);

  return (
    <EventAnnouncementArticleClient
      slug={slug}
      eventName={eventName}
      initialAnnouncement={announcement}
      initialContentHtml={html}
      initialToc={toc}
      readingTimeMin={readingTimeMin}
    />
  );
}
