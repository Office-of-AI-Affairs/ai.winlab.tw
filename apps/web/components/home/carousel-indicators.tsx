"use client";

import * as React from "react";

import { useCarousel } from "@/components/ui/carousel";
import { cn } from "@/lib/utils";

/**
 * Project-specific carousel dot indicators. Not part of stock shadcn's
 * carousel primitive (see `components/ui/carousel.tsx`) — kept here as a
 * feature-layer wrapper around the exported `useCarousel` context so
 * `components/ui/carousel.tsx` can stay byte-for-byte stock (#53).
 */
function CarouselIndicators({ className, ...props }: React.ComponentProps<"div">) {
  const { api } = useCarousel();
  const [current, setCurrent] = React.useState(0);
  const [count, setCount] = React.useState(0);

  React.useEffect(() => {
    if (!api) return;

    // shadcn-vendored: sync setState here seeds the indicator on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap());

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  return (
    <div
      data-slot="carousel-indicators"
      className={cn("flex justify-center gap-2", className)}
      {...props}
    >
      {Array.from({ length: count }).map((_, index) => (
        <button
          key={index}
          className={cn(
            "interactive-scale h-3 w-3 rounded-full border-2 border-white/80 transition-[background-color,transform]",
            current === index
              ? "bg-white scale-110"
              : "bg-transparent hover:bg-white/50"
          )}
          onClick={() => api?.scrollTo(index)}
          aria-label={`Go to slide ${index + 1}`}
        />
      ))}
    </div>
  );
}

export { CarouselIndicators };
