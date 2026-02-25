"use client";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Result } from "@/lib/supabase/types";
import { Pin, User, Users } from "lucide-react";
import Image from "next/image";

const instrumentSerif = { fontFamily: "var(--font-instrument-serif)" };

export type ResultWithMeta = Result & {
  author_name?: string | null;
  team_name?: string | null;
};

export function ResultCard({
  item,
  isAdmin,
  onPinToggle,
}: {
  item: ResultWithMeta;
  isAdmin?: boolean;
  onPinToggle?: (id: string, pinned: boolean) => void;
}) {
  const isExternalImage = (src: string | null | undefined) =>
    !!(src && (src.startsWith("http://") || src.startsWith("https://")));

  const publisherName =
    item.type === "team" ? item.team_name || "未知隊伍" : item.author_name || "匿名";

  return (
    <Card className="py-0 h-full flex flex-col gap-4 transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98] overflow-hidden">
      <div className="relative w-full aspect-video shrink-0">
        <Image
          src={item.header_image || "/placeholder.png"}
          alt={item.title}
          fill
          className="object-cover"
          unoptimized={isExternalImage(item.header_image)}
        />
        {isAdmin ? (
          <button
            type="button"
            aria-label={item.pinned ? "取消釘選" : "釘選"}
            onClick={(e) => { e.stopPropagation(); onPinToggle?.(item.id, !item.pinned); }}
            className={`absolute top-2 right-2 rounded-full p-1.5 transition-opacity duration-150 text-white ${
              item.pinned
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
      <CardFooter className="pt-0 pb-4">
        <div className="flex items-center justify-between w-full gap-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5 min-w-0">
            {item.type === "team" ? (
              <Users className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <User className="w-3.5 h-3.5 shrink-0" />
            )}
            <span className="truncate" style={instrumentSerif}>{publisherName}</span>
          </div>
          <span className="shrink-0" style={instrumentSerif}>{item.date || "—"}</span>
        </div>
      </CardFooter>
    </Card>
  );
}
