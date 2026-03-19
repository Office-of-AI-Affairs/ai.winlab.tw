import { CarouselClient } from "@/components/carousel-client";
import { getViewer } from "@/lib/supabase/get-viewer";
import type { CarouselSlide } from "@/lib/supabase/types";

export async function HomeCarousel() {
  const { supabase, isAdmin } = await getViewer();
  const { data: slides } = await supabase
    .from("carousel_slides")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  return <CarouselClient slides={(slides as CarouselSlide[]) ?? []} isAdmin={isAdmin} />;
}
