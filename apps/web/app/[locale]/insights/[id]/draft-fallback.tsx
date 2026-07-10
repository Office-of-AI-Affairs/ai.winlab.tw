"use client";

import type { ArticleListItem } from "@/app/[locale]/insights/data";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import type { Article } from "@winlab/db";
import type { TocItem } from "@/lib/ui/article";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { InsightArticleClient } from "./article-client";

type State =
  | { kind: "loading" }
  | {
      kind: "draft";
      article: ArticleListItem;
      html: string | null;
      toc: TocItem[];
      readingTimeMin: number;
    }
  | { kind: "missing" };

/**
 * Rendered by /insights/[id]/page.tsx when the cookieless lookup couldn't
 * find a published article. If the viewer is the author (member) or admin,
 * RLS lets them read the draft — we fetch it and hand off to
 * InsightArticleClient with initialMode="edit". Everyone else gets a 404.
 */
export function InsightDraftFallback({ id }: { id: string }) {
  const { user, isAdmin, isMember, isLoading } = useAuth();
  const [state, setState] = useState<State>({ kind: "loading" });
  const supabaseRef = useRef(createClient());

  const canCheck = isAdmin || isMember;

  useEffect(() => {
    if (isLoading || !canCheck) return;
    let cancelled = false;
    void (async () => {
      const { data } = await supabaseRef.current
        .from("articles")
        .select("*")
        .eq("id", id)
        .single();
      if (cancelled) return;
      if (!data) {
        setState({ kind: "missing" });
        return;
      }
      const article = data as unknown as Article;
      const isOwner = isAdmin || article.author_id === user?.id;
      if (!isOwner) {
        setState({ kind: "missing" });
        return;
      }
      // Look up author display_name so the byline renders right.
      let authorName: string | null = null;
      const { data: profile } = await supabaseRef.current
        .from("public_profiles")
        .select("display_name")
        .eq("id", article.author_id)
        .maybeSingle();
      if (cancelled) return;
      authorName = profile?.display_name ?? null;

      const { renderArticle } = await import("@/lib/ui/rich-text");
      const { estimateReadingTime } = await import("@/lib/ui/reading-time");
      const { html, toc } = renderArticle(
        article.content as Record<string, unknown> | null,
      );
      const { minutes } = estimateReadingTime(
        article.content as Record<string, unknown> | null,
      );
      setState({
        kind: "draft",
        article: { ...article, author_name: authorName },
        html,
        toc,
        readingTimeMin: minutes,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [id, canCheck, isAdmin, isLoading, user?.id]);

  if (!isLoading && !canCheck) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20">
        <div className="flex flex-col items-center gap-4">
          <h1 className="text-2xl font-bold">找不到這篇文章</h1>
          <p className="text-muted-foreground">可能已被移除、尚未發布，或網址有誤。</p>
          <Button asChild variant="secondary">
            <Link href="/insights">返回觀點列表</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading || state.kind === "loading") {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12 flex flex-col gap-6">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (state.kind === "missing") {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20">
        <div className="flex flex-col items-center gap-4">
          <h1 className="text-2xl font-bold">找不到這篇文章</h1>
          <p className="text-muted-foreground">可能已被移除、尚未發布，或網址有誤。</p>
          <Button asChild variant="secondary">
            <Link href="/insights">返回觀點列表</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <InsightArticleClient
      initialArticle={state.article}
      initialContentHtml={state.html}
      initialToc={state.toc}
      readingTimeMin={state.readingTimeMin}
      initialMode="edit"
    />
  );
}
