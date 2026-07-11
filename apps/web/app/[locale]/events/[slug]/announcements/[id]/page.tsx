import { createPublicClient } from "@/lib/supabase/public";
import type { Announcement } from "@winlab/db";
import { extractFirstImage } from "@/lib/ui/article";
import { renderArticle } from "@/lib/ui/rich-text";
import { estimateReadingTime } from "@/lib/ui/reading-time";
import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/site";
import { defaultLocale, isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { localeAlternates } from "@/lib/i18n/seo";
import { EventAnnouncementArticleClient } from "./article-client";
import { EventAnnouncementDraftFallback } from "./draft-fallback";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string; id: string }>;
}): Promise<Metadata> {
  const { locale: raw, slug, id } = await params;
  const locale: Locale = isLocale(raw) ? raw : defaultLocale;
  const dict = await getDictionary(locale);
  const supabase = createPublicClient();
  const [announcementRes, eventRes] = await Promise.all([
    supabase.from("announcements").select("title, category, content").eq("id", id).maybeSingle(),
    supabase.from("events").select("cover_image, name").eq("slug", slug).maybeSingle(),
  ]);
  const title = announcementRes.data?.title ?? dict.announcement.meta.fallbackTitle;
  const description = announcementRes.data?.category
    ? dict.announcement.meta.categoryDescription
        .replace("{category}", announcementRes.data.category)
        .replace("{title}", title)
    : dict.announcement.meta.fallbackDescription.replace("{title}", title);
  const inlineImage = announcementRes.data
    ? extractFirstImage(
        announcementRes.data.content as Record<string, unknown> | null,
      )
    : null;
  const ogImageUrl = inlineImage ?? eventRes.data?.cover_image ?? null;
  const ogImages = ogImageUrl
    ? [{ url: ogImageUrl, width: 1200, height: 630, alt: title }]
    : [{ url: "/og.png", width: 1200, height: 630, alt: title }];
  const twitterImages = ogImages.map((i) => i.url);
  const a = localeAlternates(`/events/${slug}/announcements/${id}`, locale);
  return {
    title: `${title}｜${dict.common.orgFullName}`,
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
      title: `${title}｜${dict.common.orgFullName}`,
      description,
      url: `/events/${slug}/announcements/${id}`,
      images: ogImages,
    },
    twitter: {
      card: "summary_large_image",
      title: `${title}｜${dict.common.orgFullName}`,
      description,
      images: twitterImages,
    },
  };
}

export default async function EventAnnouncementDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string; id: string }>;
}) {
  const { locale: raw, slug, id } = await params;
  const locale: Locale = isLocale(raw) ? raw : defaultLocale;
  const dict = await getDictionary(locale);
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
  const eventName = eventRes.data?.name ?? dict.events.meta.fallbackName;

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
