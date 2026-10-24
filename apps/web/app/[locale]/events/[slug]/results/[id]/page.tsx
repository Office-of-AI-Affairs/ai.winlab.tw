import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { events, public_profiles, result_coauthors, results } from "@/lib/db/schema";
import { isUuid } from "@/lib/slug";
import type { PublicProfile, Result } from "@winlab/db";
import { renderArticle } from "@/lib/ui/rich-text";
import { estimateReadingTime } from "@/lib/ui/reading-time";
import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/site";
import { defaultLocale, isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { localeAlternates, ogLocale } from "@/lib/i18n/seo";
import { localizedField } from "@/lib/i18n/localized-field";
import { ResultArticleClient, type ResultPublisher } from "./article-client";
import { ResultDraftFallback } from "./draft-fallback";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; id: string; locale: string }>;
}): Promise<Metadata> {
  const { slug, id, locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : defaultLocale;
  const dict = await getDictionary(locale);
  // Published only: RLS hid drafts from visitors, and a draft's title must
  // not reach the metadata.
  const [data] = isUuid(id)
    ? await db
        .select({ title: results.title, title_en: results.title_en, summary: results.summary })
        .from(results)
        .where(and(eq(results.id, id), eq(results.status, "published")))
        .limit(1)
    : [];
  const title = (data ? localizedField(data, "title", locale).value : null) ?? dict.results.meta.fallbackTitle;
  const description =
    data?.summary ?? dict.results.meta.fallbackDescription.replace("{title}", title);
  const a = localeAlternates(`/events/${slug}/results/${id}`, locale);
  return {
    title: `${title}｜${dict.common.orgFullName}`,
    description,
    alternates: { canonical: a.canonical, languages: a.languages },
    // Next.js App Router performs object-level replace (not deep merge) when a
    // child segment exports openGraph. All required fields must be declared here
    // explicitly; relying on layout.tsx inheritance silently drops og:type /
    // og:site_name / og:locale. `images` is intentionally omitted — the
    // sibling `opengraph-image.tsx` file convention (#49) generates a
    // per-result branded card and Next injects it automatically.
    openGraph: {
      type: "article",
      siteName: SITE_NAME,
      locale: ogLocale(locale),
      title: `${title}｜${dict.common.orgFullName}`,
      description,
      url: `/events/${slug}/results/${id}`,
    },
    twitter: {
      card: "summary_large_image",
      title: `${title}｜${dict.common.orgFullName}`,
      description,
    },
  };
}

export default async function EventResultDetailPage({
  params,
}: {
  params: Promise<{ slug: string; id: string; locale: string }>;
}) {
  const { slug, id, locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : defaultLocale;
  const dict = await getDictionary(locale);
  const [published] = isUuid(id)
    ? await db
        .select()
        .from(results)
        .where(and(eq(results.id, id), eq(results.status, "published")))
        .limit(1)
    : [];

  if (!published) {
    return <ResultDraftFallback slug={slug} id={id} />;
  }

  // The Result overlay narrows content and summary (see packages/db).
  const result = published as Result;

  const [[eventRow], [publisherRow], coauthors] = await Promise.all([
    db
      .select({ name: events.name, name_en: events.name_en })
      .from(events)
      .where(and(eq(events.slug, slug), eq(events.status, "published")))
      .limit(1),
    result.author_id
      ? db
          .select({ id: public_profiles.id, display_name: public_profiles.display_name })
          .from(public_profiles)
          .where(eq(public_profiles.id, result.author_id))
          .limit(1)
      : Promise.resolve([]),
    db
      .select({
        id: public_profiles.id,
        created_at: public_profiles.created_at,
        updated_at: public_profiles.updated_at,
        display_name: public_profiles.display_name,
      })
      .from(result_coauthors)
      .innerJoin(public_profiles, eq(public_profiles.id, result_coauthors.user_id))
      .where(eq(result_coauthors.result_id, result.id))
      .then((rows) => rows as PublicProfile[]),
  ]);

  const publisher: ResultPublisher = publisherRow
    ? { id: publisherRow.id, name: publisherRow.display_name || dict.common.unknownUser }
    : null;

  const { html, toc } = renderArticle(result.content);
  const { minutes: readingTimeMin } = estimateReadingTime(result.content);

  return (
    <ResultArticleClient
      slug={slug}
      eventName={eventRow ? localizedField(eventRow, "name", locale).value : dict.events.meta.fallbackName}
      initialResult={result}
      initialContentHtml={html}
      initialToc={toc}
      readingTimeMin={readingTimeMin}
      initialPublisher={publisher}
      initialCoauthors={coauthors}
    />
  );
}
