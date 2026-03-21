"use client";

import { AppLink } from "@/components/app-link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { RecruitmentSummary } from "@/lib/supabase/types";
import { isExternalImage } from "@/lib/utils";
import { Pencil } from "lucide-react";
import Image from "next/image";

type RecruitmentCardProps = {
  item: RecruitmentSummary;
  href: string;
  onEdit?: () => void;
};

export function RecruitmentCard({ item, href, onEdit }: RecruitmentCardProps) {
  const isExpired = item.end_date ? new Date(item.end_date) < new Date() : false;

  return (
    <Card className="relative py-0 h-full overflow-hidden">
      <AppLink href={href} className="flex h-full flex-col gap-4">
        <div className="relative w-full aspect-video shrink-0">
          <Image
            src={item.image || "/placeholder.png"}
            alt={item.title}
            fill
            className="object-cover"
            unoptimized={isExternalImage(item.image)}
          />
        </div>
        <CardHeader className="shrink-0 pb-0">
          <CardTitle className="text-xl font-bold line-clamp-2">
            {item.title || "(無標題)"}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 pt-1 pb-4 flex flex-col gap-2">
          {item.company_description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {item.company_description}
            </p>
          )}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>
              {item.start_date}
              {item.end_date ? ` ~ ${item.end_date}` : " 起"}
            </span>
            {isExpired && (
              <span className="bg-red-100 text-red-800 rounded-full px-2 py-0.5 text-xs">
                已截止
              </span>
            )}
          </div>
        </CardContent>
      </AppLink>
      {onEdit && (
        <button
          type="button"
          className="absolute top-2 right-2 z-10 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70 transition-colors cursor-pointer"
          onClick={onEdit}
          aria-label="編輯"
        >
          <Pencil className="w-4 h-4" />
        </button>
      )}
    </Card>
  );
}

export function RecruitmentCardSkeleton() {
  return (
    <Card className="py-0 h-full flex flex-col gap-4 overflow-hidden">
      <Skeleton className="aspect-video w-full rounded-none" />
      <CardHeader className="shrink-0 pb-0">
        <Skeleton className="h-7 w-3/4 rounded-lg" />
      </CardHeader>
      <CardContent className="flex-1 pt-1 pb-4 flex flex-col gap-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
      </CardContent>
    </Card>
  );
}
