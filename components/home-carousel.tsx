import { CarouselClient } from "@/components/carousel-client";
import { createClient } from "@/lib/supabase/server";
import type { CarouselSlide } from "@/lib/supabase/types";

export async function HomeCarousel() {
  const supabase = await createClient();
  const { data: slides } = await supabase
    .from("carousel_slides")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  return <CarouselClient slides={(slides as CarouselSlide[]) ?? []} />;
}
