"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Recruitment } from "@/lib/supabase/types";
import { isExternalImage } from "@/lib/utils";
import { ArrowUpRight } from "lucide-react";
import Image from "next/image";

export function RecruitmentCard({ item }: { item: Recruitment }) {
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
        <div
          className="absolute top-2 right-2 rounded-full bg-black/50 p-1.5 text-white pointer-events-none"
          aria-hidden
        >
          <ArrowUpRight className="w-4 h-4" />
        </div>
      </div>
      <CardHeader className="shrink-0 pb-0">
        <CardTitle className="text-xl font-bold line-clamp-2">
          {item.title || "(無標題)"}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 pt-1 pb-4 flex flex-col gap-2">
        {item.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
        )}
        {item.positions && item.positions.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {item.positions.map((pos, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm font-medium"
              >
                {pos.name}
                {pos.location && (
                  <span className="text-muted-foreground">· {pos.location}</span>
                )}
                <span className="text-muted-foreground">× {pos.count}</span>
              </span>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
