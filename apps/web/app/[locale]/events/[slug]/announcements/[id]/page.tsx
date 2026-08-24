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
import { localizedPath } from "@/lib/i18n/routing";
import { isUuid } from "@/lib/slug";
import { permanentRedirect } from "next/navigation";
import { EventAnnouncementArticleClient } from "./article-client";
import { EventAnnouncementDraftFallback } from "./draft-fallback";

// Next.js does not consistently decode the `[id]` segment before it reaches
// the page component (observed inconsistency vs. generateMetadata's params
// on Next 16 / Turbopack for CJK route params — see the sibling
// announcement/[id]/page.tsx for the fuller writeup). Decode defensively;
// slugs can never contain a literal "%" (stripped in lib/slug.ts), so
// decoding an already-decoded string is always a safe no-op.
function decodeParam(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

// `param` is whatever arrived in the `[id]` route segment — a slug for every
// link this app generates, or a legacy UUID for old bookmarks/backlinks.
// Slug lookup first; UUID fallback only if the param actually looks like one.
async function findAnnouncement(
  supabase: ReturnType<typeof createPublicClient>,
  eventId: string,
  param: string,
  { publishedOnly }: { publishedOnly: boolean },
): Promise<Announcement | null> {
  let query = supabase.from("announcements").select("*").eq("event_id", eventId);
  if (publishedOnly) query = query.eq("status", "published");
  const { data: bySlug } = await query.eq("slug", param).maybeSingle();
  if (bySlug) return bySlug as Announcement;
  if (!isUuid(param)) return null;
  let byIdQuery = supabase.from("announcements").select("*").eq("event_id", eventId);
  if (publishedOnly) byIdQuery = byIdQuery.eq("status", "published");
  const { data: byId } = await byIdQuery.eq("id", param).maybeSingle();
  return (byId as Announcement | null) ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string; id: string }>;
}): Promise<Metadata> {
  const { locale: raw, slug, id: rawId } = await params;
  const id = decodeParam(rawId);
  const locale: Locale = isLocale(raw) ? raw : defaultLocale;
  const dict = await getDictionary(locale);
  const supabase = createPublicClient();
  const eventRes = await supabase
    .from("events")
    .select("id, cover_image, name")
    .eq("slug", slug)
    .maybeSingle();
  const announcement = eventRes.data
    ? await findAnnouncement(supabase, eventRes.data.id, id, { publishedOnly: false })
    : null;
  const title = announcement?.title ?? dict.announcement.meta.fallbackTitle;
  const description = announcement?.category
    ? dict.announcement.meta.categoryDescription
        .replace("{category}", announcement.category)
        .replace("{title}", title)
    : dict.announcement.meta.fallbackDescription.replace("{title}", title);
  const inlineImage = announcement
    ? extractFirstImage(announcement.content as Record<string, unknown> | null)
    : null;
  const ogImageUrl = inlineImage ?? eventRes.data?.cover_image ?? null;
  const ogImages = ogImageUrl
    ? [{ url: ogImageUrl, width: 1200, height: 630, alt: title }]
    : [{ url: "/og.png", width: 1200, height: 630, alt: title }];
  const twitterImages = ogImages.map((i) => i.url);
  // Canonical always points at the slug URL, even when this render was
  // reached via a legacy UUID link.
  const canonicalId = announcement?.slug ?? id;
  const a = localeAlternates(
    `/events/${slug}/announcements/${encodeURIComponent(canonicalId)}`,
    locale,
  );
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
      url: `/events/${slug}/announcements/${encodeURIComponent(canonicalId)}`,
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
  const { locale: raw, slug, id: rawId } = await params;
  const id = decodeParam(rawId);
  const locale: Locale = isLocale(raw) ? raw : defaultLocale;
  const dict = await getDictionary(locale);
  const supabase = createPublicClient();

  const eventRes = await supabase.from("events").select("id, name").eq("slug", slug).maybeSingle();
  const eventId = eventRes.data?.id;
  const announcement = eventId
    ? await findAnnouncement(supabase, eventId, id, { publishedOnly: true })
    : null;

  if (!announcement) {
    return <EventAnnouncementDraftFallback slug={slug} id={id} />;
  }

  // Legacy `[uuid]` link that resolved by id — send visitors (and search
  // engines) forward to the canonical slug URL permanently.
  if (isUuid(id) && announcement.slug !== id) {
    permanentRedirect(
      localizedPath(
        `/events/${slug}/announcements/${encodeURIComponent(announcement.slug)}`,
        locale,
      ),
    );
  }

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
