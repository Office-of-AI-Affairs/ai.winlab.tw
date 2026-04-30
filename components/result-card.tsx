"use client";

import { AppLink } from "@/components/app-link";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/date";
import type { Result } from "@/lib/supabase/types";
import { isExternalImage, resolveImageSrc } from "@/lib/utils";
import { Pin, User } from "lucide-react";
import Image from "next/image";

export type CoauthorMeta = { id: string; name: string };

export type ResultWithMeta = Result & {
  author_name?: string | null;
  coauthors?: CoauthorMeta[];
};

export function ResultCard({
  item,
  href,
  publisherHref,
  isAdmin,
  showStatus,
  onPinToggle,
}: {
  item: ResultWithMeta;
  href: string;
  publisherHref?: string | null;
  isAdmin?: boolean;
  showStatus?: boolean;
  onPinToggle?: (id: string, pinned: boolean) => void;
}) {
  const primaryName = item.author_name || "匿名";

  return (
    <Card className="interactive-scale py-0 h-full flex flex-col gap-4 overflow-hidden">
      <AppLink href={href} className="flex flex-1 flex-col gap-4" interactive={false}>
        <div className="relative w-full aspect-video shrink-0">
          <Image
            src={resolveImageSrc(item.header_image)}
            alt={item.title}
            fill
            className="object-cover"
            unoptimized={isExternalImage(item.header_image)}
          />
          {showStatus && (
            <Badge
              variant={item.status === "published" ? "default" : "secondary"}
              className="absolute top-2 left-2"
            >
              {item.status === "published" ? "已發布" : "草稿"}
            </Badge>
          )}
          {isAdmin ? (
            <button
              type="button"
              aria-label={item.pinned ? "取消釘選" : "釘選"}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onPinToggle?.(item.id, !item.pinned); }}
              className={`absolute top-2 right-2 rounded-full p-1.5 interactive-opacity text-white ${item.pinned
                ? "bg-black/50 opacity-100"
                : "bg-black/50 opacity-40 hover:opacity-80"
                }`}
            >
              <Pin className="w-4 h-4" fill={item.pinned ? "currentColor" : "none"} />
            </button>
          ) : item.pinned ? (
            <div
              className="absolute top-2 right-2 rounded-full bg-black/50 p-1.5 text-white pointer-events-none"
              aria-hidden
            >
              <Pin className="w-4 h-4" fill="currentColor" />
            </div>
          ) : null}
        </div>
        <CardHeader className="shrink-0 pb-0">
          <CardTitle className="text-xl font-bold line-clamp-2">
            {item.title || "(無標題)"}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 pt-1">
          <p className="line-clamp-3 text-muted-foreground text-sm">
            {item.summary || "（無摘要）"}
          </p>
        </CardContent>
      </AppLink>
      <CardFooter className="pt-0 pb-4">
        <div className="flex items-center justify-between w-full gap-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5 min-w-0">
            <User className="w-3.5 h-3.5 shrink-0" />
            <span className="flex flex-wrap items-center gap-x-1">
              {publisherHref ? (
                <AppLink
                  href={publisherHref}
                  className="underline underline-offset-4"
                  onClick={(e) => e.stopPropagation()}
                >
                  {primaryName}
                </AppLink>
              ) : (
                <span>{primaryName}</span>
              )}
              {(item.coauthors ?? []).map((ca) => (
                <span key={ca.id}>
                  、
                  <AppLink
                    href={`/profile/${ca.id}`}
                    className="underline underline-offset-4"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {ca.name}
                  </AppLink>
                </span>
              ))}
            </span>
          </div>
          <span className="shrink-0">{formatDate(item.updated_at)}</span>
        </div>
      </CardFooter>
    </Card>
  );
}

export function ResultCardSkeleton() {
  return (
    <Card className="py-0 h-full flex flex-col gap-4 overflow-hidden">
      <Skeleton className="aspect-video w-full rounded-none" />
      <CardHeader className="shrink-0 pb-0">
        <Skeleton className="h-7 w-3/4 rounded-lg" />
      </CardHeader>
      <CardContent className="flex-1 pt-1">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </CardContent>
      <CardFooter className="pt-0 pb-4">
        <div className="flex items-center justify-between w-full gap-2">
          <div className="flex items-center gap-1.5 min-w-0 w-full">
            <Skeleton className="size-4 rounded-full shrink-0" />
            <Skeleton className="h-4 w-1/3" />
          </div>
          <Skeleton className="h-4 w-20 shrink-0" />
        </div>
      </CardFooter>
    </Card>
  );
}
