import { createPublicClient } from "@/lib/supabase/public";
import type { PublicProfile, Result } from "@/lib/supabase/types";
import { renderArticle } from "@/lib/ui/rich-text";
import { estimateReadingTime } from "@/lib/ui/reading-time";
import type { Metadata } from "next";
import { ResultArticleClient, type ResultPublisher } from "./article-client";
import { ResultDraftFallback } from "./draft-fallback";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}): Promise<Metadata> {
  const { slug, id } = await params;
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("results")
    .select("title, summary, header_image")
    .eq("id", id)
    .maybeSingle();
  const title = data?.title ?? "成果";
  const description = data?.summary ?? `${title}｜國立陽明交通大學人工智慧專責辦公室成果展示`;
  const ogImages = data?.header_image
    ? [{ url: data.header_image, width: 1200, height: 630, alt: title }]
    : [];
  const twitterImages = ogImages.length ? ogImages.map((i) => i.url) : ["/og.png"];
  return {
    title: `${title}｜人工智慧專責辦公室`,
    description,
    alternates: { canonical: `/events/${slug}/results/${id}` },
    openGraph: {
      title: `${title}｜人工智慧專責辦公室`,
      description,
      url: `/events/${slug}/results/${id}`,
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

export default async function EventResultDetailPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const supabase = createPublicClient();

  const { data: published } = await supabase
    .from("results")
    .select("*")
    .eq("id", id)
    .eq("status", "published")
    .maybeSingle();

  if (!published) {
    return <ResultDraftFallback slug={slug} id={id} />;
  }

  const result = published as Result;

  const [{ data: eventRow }, { data: publisherRow }, { data: coauthorRows }] =
    await Promise.all([
      supabase.from("events").select("name").eq("slug", slug).maybeSingle(),
      result.author_id
        ? supabase
            .from("public_profiles")
            .select("id, display_name")
            .eq("id", result.author_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      supabase
        .from("result_coauthors")
        .select("user_id")
        .eq("result_id", result.id),
    ]);

  let coauthors: PublicProfile[] = [];
  if (coauthorRows?.length) {
    const userIds = coauthorRows.map((row) => row.user_id);
    const { data: profiles } = await supabase
      .from("public_profiles")
      .select("id, created_at, updated_at, display_name")
      .in("id", userIds);
    coauthors = (profiles ?? []) as PublicProfile[];
  }

  const publisher: ResultPublisher = publisherRow
    ? { id: publisherRow.id, name: publisherRow.display_name || "未知使用者" }
    : null;

  const { html, toc } = renderArticle(result.content);
  const { minutes: readingTimeMin } = estimateReadingTime(result.content);

  return (
    <ResultArticleClient
      slug={slug}
      eventName={eventRow?.name ?? "活動"}
      initialResult={result}
      initialContentHtml={html}
      initialToc={toc}
      readingTimeMin={readingTimeMin}
      initialPublisher={publisher}
      initialCoauthors={coauthors}
    />
  );
}
