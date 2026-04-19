import { CarouselClient } from "@/components/carousel-client";
import { getCarouselSlides } from "@/lib/home-data";

export async function HomeCarousel() {
  const slides = await getCarouselSlides();
  return <CarouselClient slides={slides} />;
}
