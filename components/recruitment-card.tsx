"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Recruitment } from "@/lib/supabase/types";
import { isExternalImage } from "@/lib/utils";
import { Pencil } from "lucide-react";
import Image from "next/image";

type RecruitmentCardProps = {
  item: Recruitment;
  onEdit?: () => void;
};

export function RecruitmentCard({ item, onEdit }: RecruitmentCardProps) {
  const positionCount = item.positions?.reduce((sum, p) => sum + p.count, 0) ?? 0;
  const isExpired = item.end_date ? new Date(item.end_date) < new Date() : false;

  return (
    <Card className="py-0 h-full flex flex-col gap-4 transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98] overflow-hidden">
      <div className="relative w-full aspect-video shrink-0">
        <Image
          src={item.image || "/placeholder.png"}
          alt={item.title}
          fill
          className="object-cover"
          unoptimized={isExternalImage(item.image)}
        />
        {onEdit && (
          <button
            type="button"
            className="absolute top-2 right-2 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70 transition-colors cursor-pointer"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onEdit();
            }}
            aria-label="編輯"
          >
            <Pencil className="w-4 h-4" />
          </button>
        )}
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
        {positionCount > 0 && (
          <p className="text-sm text-muted-foreground">{positionCount} 個職缺</p>
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
    </Card>
  );
}
