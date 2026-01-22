"use client"

import {
  Carousel,
  CarouselContent,
  CarouselIndicators,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import Autoplay from "embla-carousel-autoplay"
import { ChevronLeft, ChevronRight } from "lucide-react"
import * as React from "react"

// Sample carousel data - replace with actual data
const carouselSlides = [
  {
    id: 1,
    image: "/carousel/1.jpg",
    title: "AI架構師實戰班 Cloud × Core × Edge",
    subtitle: "零程式基礎也能上手，專注架構與應用而非深度程式開發",
    link: "#",
  },
  {
    id: 2,
    image: "/carousel/2.jpg",
    title: "AI架構師實戰班 Cloud × Core × Edge",
    subtitle: "零程式基礎也能上手，專注架構與應用而非深度程式開發",
    link: "#",
  },
]

export function HomeCarousel() {
  const plugin = React.useRef(
    Autoplay({ delay: 5000, stopOnInteraction: true })
  )

  return (
    <Carousel
      plugins={[plugin.current]}
      className="w-full relative group"
      onMouseEnter={plugin.current.stop}
      onMouseLeave={plugin.current.reset}
      opts={{
        loop: true,
      }}
    >
      <CarouselContent className="ml-0">
        {carouselSlides.map((slide) => (
          <CarouselItem key={slide.id} className="pl-0">
            <div className="relative w-full aspect-5/2 min-h-[300px] md:min-h-[400px] lg:min-h-[500px]">
              {/* Background Image */}
              <div
                className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                style={{
                  backgroundImage: `url(${slide.image})`,
                }}
              />
              {/* Dark Overlay */}
              <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/10 to-black/0" />
              {/* Content */}
              <div className="absolute inset-0 flex flex-col items-center justify-end text-white px-4 md:px-8 pb-12 md:pb-16">
                <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold text-center mb-4 drop-shadow-lg">
                  {slide.title}
                </h2>
                <a
                  href={slide.link}
                  className="text-sm md:text-lg lg:text-xl text-center max-w-3xl hover:text-amber-300 transition-colors duration-300 drop-shadow-md"
                >
                  {slide.subtitle}
                </a>
              </div>
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>

      {/* Navigation Buttons */}
      <CarouselPrevious
        variant="ghost"
        className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 h-10 w-10 md:h-12 md:w-12 rounded-full bg-black/30 hover:bg-black/50 text-white border-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
      >
        <ChevronLeft className="h-6 w-6 md:h-8 md:w-8" />
      </CarouselPrevious>
      <CarouselNext
        variant="ghost"
        className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 h-10 w-10 md:h-12 md:w-12 rounded-full bg-black/30 hover:bg-black/50 text-white border-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
      >
        <ChevronRight className="h-6 w-6 md:h-8 md:w-8" />
      </CarouselNext>

      {/* Indicators */}
      <CarouselIndicators className="absolute bottom-4 md:bottom-6 left-1/2 -translate-x-1/2" />
    </Carousel>
  )
}
