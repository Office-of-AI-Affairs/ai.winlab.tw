"use client";

import { AppLink } from "@/components/app-link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/date";
import { useT } from "@/lib/i18n/locale-provider";
import type { ArticleListItem } from "@/app/[locale]/insights/data";

type Props = {
  article: ArticleListItem;
  href: string;
  showDraftBadge?: boolean;
};

export function InsightCard({ article, href, showDraftBadge = false }: Props) {
  const t = useT();
  return (
    <AppLink
      href={href}
      className="interactive-scale group flex"
      aria-label={article.title || t.common.untitled}
    >
      <Card className="flex flex-1 flex-col gap-3 py-5 transition-[border-color,box-shadow] duration-200 hover:border-foreground/30 hover:shadow-md">
        <CardHeader className="px-5">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="line-clamp-2 text-lg font-semibold">
              {article.title || t.common.untitled}
            </CardTitle>
            {showDraftBadge && article.status === "draft" && (
              <Badge variant="secondary" className="shrink-0">{t.common.draft}</Badge>
            )}
          </div>
        </CardHeader>
        {article.summary && (
          <CardContent className="px-5">
            <p className="line-clamp-3 text-sm text-muted-foreground">
              {article.summary}
            </p>
          </CardContent>
        )}
        <CardFooter className="mt-auto px-5 text-xs text-muted-foreground">
          <span className="flex-1 truncate">{article.author_name ?? "—"}</span>
          <span className="shrink-0">{formatDate(article.published_at ?? article.created_at)}</span>
        </CardFooter>
      </Card>
    </AppLink>
  );
}

export function InsightCardSkeleton() {
  return (
    <Card className="flex flex-1 flex-col gap-3 py-5">
      <CardHeader className="px-5">
        <Skeleton className="h-6 w-3/4" />
      </CardHeader>
      <CardContent className="px-5 flex flex-col gap-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </CardContent>
      <CardFooter className="mt-auto px-5">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="ml-auto h-3 w-16" />
      </CardFooter>
    </Card>
  );
}
