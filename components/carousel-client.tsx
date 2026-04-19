"use client";

import {
  Carousel,
  CarouselContent,
  CarouselIndicators,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { AppLink } from "@/components/app-link";
import { useAuth } from "@/components/auth-provider";
import type { CarouselSlide } from "@/lib/supabase/types";
import { resolveImageSrc } from "@/lib/utils";
import Autoplay from "embla-carousel-autoplay";
import { ChevronLeft, ChevronRight, Pencil } from "lucide-react";
import Link from "next/link";
import * as React from "react";

export function CarouselClient({
  slides,
}: {
  slides: CarouselSlide[];
}) {
  const { isAdmin } = useAuth();
  const plugin = React.useRef(
    Autoplay({ delay: 5000, stopOnInteraction: true })
  );

  if (slides.length === 0) {
    if (isAdmin) {
      return (
        <div className="max-w-6xl mx-auto px-4 py-8">
          <Link
            href="/carousel"
            className="inline-flex items-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 px-4 py-6 w-full justify-center text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors"
          >
            <Pencil className="w-5 h-5" />
            尚無橫幅，點此新增首頁輪播
          </Link>
        </div>
      );
    }
    return (
      <div className="w-full max-w-6xl mx-auto relative">
        <div className="relative w-full aspect-video min-h-[200px] bg-muted">
          <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground px-4">
            <p className="text-base md:text-lg font-medium">國立陽明交通大學 人工智慧專責辦公室</p>
            <p className="text-sm mt-1">歡迎來到 AI Office</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto relative">
      {isAdmin && (
        <Link
          href="/carousel"
          className="absolute top-3 right-3 z-10 inline-flex items-center gap-1.5 rounded-md bg-black/50 px-3 py-1.5 text-sm font-medium text-white hover:bg-black/70 transition-colors"
        >
          <Pencil className="w-3.5 h-3.5" />
          編輯橫幅
        </Link>
      )}
      <Carousel
        plugins={[plugin.current]}
        className="w-full relative group"
        onMouseEnter={plugin.current.stop}
        onMouseLeave={plugin.current.reset}
        onFocus={plugin.current.stop}
        onBlur={plugin.current.reset}
        opts={{ loop: true }}
      >
        <CarouselContent className="ml-0">
          {slides.map((slide) => {
            const slideContent = (
              <>
                <div
                  className="absolute inset-0 bg-cover bg-center bg-no-repeat bg-muted"
                  style={{ backgroundImage: `url(${resolveImageSrc(slide.image)})` }}
                />
                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-black/60 to-transparent" />
                <div className="absolute inset-0 flex flex-col items-center justify-end text-white px-4 md:px-8 pb-12 md:pb-16 pointer-events-none">
                  <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-center mb-3">
                    {slide.title}
                  </h2>
                  {slide.description && (
                    <span className="inline-block text-xs md:text-sm lg:text-base text-center max-w-3xl">
                      {slide.description}
                    </span>
                  )}
                </div>
              </>
            );
            return (
              <CarouselItem key={slide.id} className="pl-0">
                {slide.link ? (
                  <AppLink
                    href={slide.link}
                    className="relative block w-full aspect-video min-h-[200px] cursor-pointer"
                  >
                    {slideContent}
                  </AppLink>
                ) : (
                  <div className="relative block w-full aspect-video min-h-[200px]">
                    {slideContent}
                  </div>
                )}
              </CarouselItem>
            );
          })}
        </CarouselContent>
        <CarouselPrevious
          variant="ghost"
          className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 h-10 w-10 md:h-12 md:w-12 rounded-full bg-black/30 hover:bg-black/50 text-white border-none opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 interactive-opacity"
        >
          <ChevronLeft className="h-6 w-6 md:h-8 md:w-8" />
        </CarouselPrevious>
        <CarouselNext
          variant="ghost"
          className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 h-10 w-10 md:h-12 md:w-12 rounded-full bg-black/30 hover:bg-black/50 text-white border-none opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 interactive-opacity"
        >
          <ChevronRight className="h-6 w-6 md:h-8 md:w-8" />
        </CarouselNext>
        <CarouselIndicators className="absolute bottom-4 md:bottom-6 left-1/2 -translate-x-1/2" />
      </Carousel>
    </div>
  );
}
