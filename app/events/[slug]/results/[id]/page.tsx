import { JsonLd } from "@/components/json-ld";
import { ResultDetail, type PublisherInfo, type CoauthorInfo } from "@/components/result-detail";
import { ShareButtons } from "@/components/share-buttons";
import { buildBreadcrumbJsonLd } from "@/lib/seo/breadcrumb";
import { createClient } from "@/lib/supabase/server";
import type { Result } from "@/lib/supabase/types";
import { ArrowLeft, Pencil } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}): Promise<Metadata> {
  const { slug, id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("results").select("title, summary, header_image").eq("id", id).single();
  const title = data?.title ?? "成果";
  const description = data?.summary ?? `${title}｜國立陽明交通大學人工智慧專責辦公室成果展示`;
  const ogImages = data?.header_image
    ? [{ url: data.header_image, width: 1200, height: 630, alt: title }]
    : [];
  const twitterImages = ogImages.length ? ogImages.map((i) => i.url) : ["/og.png"];
  return {
    title: `${title}｜人工智慧專責辦公室`,
    description,
    alternates: {
      canonical: `/events/${slug}/results/${id}`,
    },
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
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("results")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) notFound();

  if (data.status === "draft") {
    const { data: profile } = user
      ? await supabase.from("profiles").select("role").eq("id", user.id).single()
      : { data: null };
    const isAdmin = profile?.role === "admin";
    const isAuthor = data.author_id === user?.id;
    if (!isAdmin && !isAuthor) notFound();
    redirect(`/events/${slug}/results/${id}/edit`);
  }

  const result = data as Result;

  // Determine if current user can edit
  let canEdit = false;
  if (user) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    const isAdmin = profile?.role === "admin";
    const isAuthor = result.author_id === user.id;
    canEdit = isAdmin || isAuthor;
  }

  let publisherInfo: PublisherInfo = null;
  if (result.author_id) {
    const { data: profile } = await supabase.from("public_profiles").select("display_name").eq("id", result.author_id).single();
    if (profile) publisherInfo = { name: profile.display_name || "未知使用者", href: `/profile/${result.author_id}` };
  }

  // Fetch co-authors
  const coauthors: CoauthorInfo[] = [];
  const { data: coauthorRows } = await supabase
    .from("result_coauthors")
    .select("user_id")
    .eq("result_id", result.id);
  if (coauthorRows?.length) {
    const userIds = coauthorRows.map((r) => r.user_id);
    const { data: profiles } = await supabase
      .from("public_profiles")
      .select("id, display_name")
      .in("id", userIds);
    for (const p of profiles ?? []) {
      coauthors.push({ id: p.id, name: p.display_name || "未知使用者" });
    }
  }

  const { data: eventRow } = await supabase
    .from("events")
    .select("name")
    .eq("slug", slug)
    .maybeSingle();
  const eventName = eventRow?.name ?? "活動";
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "首頁", path: "/" },
    { name: "活動", path: "/events" },
    { name: eventName, path: `/events/${slug}` },
    { name: result.title, path: `/events/${slug}/results/${id}` },
  ]);

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: result.title,
    datePublished: result.date,
    url: `https://ai.winlab.tw/events/${slug}/results/${id}`,
    ...(publisherInfo || coauthors.length
      ? {
          author: [
            ...(publisherInfo ? [{ "@type": "Person", name: publisherInfo.name }] : []),
            ...coauthors.map((ca) => ({ "@type": "Person", name: ca.name })),
          ],
        }
      : {}),
    publisher: {
      "@type": "Organization",
      name: "國立陽明交通大學 人工智慧專責辦公室",
      url: "https://ai.winlab.tw",
    },
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <JsonLd data={structuredData} />
      <JsonLd data={breadcrumbJsonLd} />
      <div className="flex items-center justify-between mb-10">
        <Link
          href={`/events/${slug}?tab=results`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          返回活動
        </Link>
        <div className="flex items-center gap-3">
          <ShareButtons url={`/events/${slug}/results/${id}`} title={result.title} />
          {canEdit && (
            <Link
              href={`/events/${slug}/results/${id}/edit`}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Pencil className="w-4 h-4" />
              編輯
            </Link>
          )}
        </div>
      </div>

      <ResultDetail result={result} publisherInfo={publisherInfo} coauthors={coauthors} />
    </div>
  );
}
