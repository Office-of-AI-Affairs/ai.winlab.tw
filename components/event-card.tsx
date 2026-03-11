"use client";

import { Block } from "@/components/ui/block";
import type { Event } from "@/lib/supabase/types";
import { isExternalImage } from "@/lib/utils";
import { AspectRatio } from "@radix-ui/react-aspect-ratio";
import Image from "next/image";

export function EventCard({
  item,
  isAdmin,
  compact,
}: {
  item: Event;
  isAdmin?: boolean;
  compact?: boolean;
}) {
  return (
    <Block className="overflow-hidden flex flex-col lg:grid lg:grid-cols-2 gap-4">
      <div className="-mx-6 -mt-6 lg:hidden">
        <AspectRatio ratio={16 / 9}>
          <Image
            src={item.cover_image || "/placeholder.png"}
            alt={item.name}
            fill
            className="object-cover"
            unoptimized={isExternalImage(item.cover_image)}
          />
        </AspectRatio>
      </div>
      <div className="grid gap-2 lg:content-center">
        <h2 className={`${compact ? "text-lg" : "text-2xl"} font-bold line-clamp-2`}>
          {item.name || "(無標題)"}
        </h2>
        <p className={`${compact ? "text-sm" : "text-base"} text-muted-foreground line-clamp-3`}>
          {item.description || "（無描述）"}
        </p>
      </div>
      <div className="hidden lg:block -my-6 -mr-6">
        <AspectRatio ratio={16 / 9}>
          <Image
            src={item.cover_image || "/placeholder.png"}
            alt={item.name}
            fill
            className="object-cover"
            unoptimized={isExternalImage(item.cover_image)}
          />
        </AspectRatio>
      </div>
    </Block>
  );
}
