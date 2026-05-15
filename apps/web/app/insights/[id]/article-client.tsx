"use client";

import { JsonLd } from "@/components/json-ld";
import { ShareButtons } from "@/components/share-buttons";
import { Toc } from "@/components/toc";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/date";
import { buildBreadcrumbJsonLd } from "@/lib/seo/breadcrumb";
import { richTextDocumentClassName } from "@/lib/ui/rich-text";
import type { TocItem } from "@/lib/ui/article";
import type { ArticleListItem } from "@/app/insights/data";
import { ArrowLeft, Pencil } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

type Props = {
  article: ArticleListItem;
  contentHtml: string | null;
  toc: TocItem[];
  readingTimeMin: number;
};

export function InsightArticleClient({ article, contentHtml, toc, readingTimeMin }: Props) {
  const { user, isAdmin, isMember } = useAuth();
  const canEdit = isAdmin || (isMember && user?.id === article.author_id);

  const sharePath = `/insights/${article.id}`;
  const shareUrl = `https://ai.winlab.tw${sharePath}`;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    datePublished: article.published_at ?? article.created_at,
    dateModified: article.updated_at,
    author: article.author_name
      ? { "@type": "Person", name: article.author_name }
      : undefined,
    url: shareUrl,
    publisher: {
      "@type": "Organization",
      name: "國立陽明交通大學 人工智慧專責辦公室",
      url: "https://ai.winlab.tw",
    },
  };

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "首頁", path: "/" },
    { name: "觀點", path: "/insights" },
    { name: article.title, path: sharePath },
  ]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <JsonLd data={structuredData} />
      <JsonLd data={breadcrumbJsonLd} />

      <div className="mb-10 flex items-center justify-between gap-4">
        <Link
          href="/insights"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
        >
          <ArrowLeft className="w-4 h-4" />
          返回列表
        </Link>
        <div className="flex items-center gap-2">
          {canEdit && (
            <Button asChild size="sm" variant="outline">
              <Link href={`/insights/${article.id}/edit`}>
                <Pencil className="size-4" />
                編輯
              </Link>
            </Button>
          )}
          <ShareButtons url={sharePath} title={article.title} />
        </div>
      </div>

      {article.cover_image_url && (
        <div className="mb-8 overflow-hidden rounded-2xl border">
          <Image
            src={article.cover_image_url}
            alt={article.title}
            width={1200}
            height={630}
            className="w-full h-auto object-cover"
            priority
          />
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-4xl font-extrabold tracking-tight text-balance mb-4">
          {article.title}
        </h1>
        {article.summary && (
          <p className="text-lg text-muted-foreground mb-4">{article.summary}</p>
        )}
        <div className="flex flex-wrap items-center gap-2 text-base text-muted-foreground">
          {article.author_name && (
            <>
              <span>{article.author_name}</span>
              <span aria-hidden className="opacity-30">·</span>
            </>
          )}
          <span>{formatDate(article.published_at ?? article.created_at)}</span>
          {readingTimeMin ? (
            <>
              <span aria-hidden className="opacity-30">·</span>
              <span>閱讀 {readingTimeMin} 分鐘</span>
            </>
          ) : null}
        </div>
      </div>

      <hr className="mb-8" />

      <div className="max-w-6xl lg:flex lg:items-start lg:gap-8">
        <div className="min-w-0 flex-1">
          {contentHtml ? (
            <div
              className={richTextDocumentClassName}
              dangerouslySetInnerHTML={{ __html: contentHtml }}
            />
          ) : (
            <p className="text-muted-foreground">（無內容）</p>
          )}
        </div>
        <Toc items={toc} className="hidden lg:block" />
      </div>
    </div>
  );
}
