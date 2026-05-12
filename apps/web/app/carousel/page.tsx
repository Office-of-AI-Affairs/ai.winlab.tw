import { CarouselPageClient } from "./client";
import { requireAdminServer } from "@/lib/supabase/require-admin-server";
import type { CarouselSlide } from "@/lib/supabase/types";

export default async function CarouselPage() {
  const { supabase } = await requireAdminServer();
  const { data } = await supabase
    .from("carousel_slides")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  return (
    <CarouselPageClient
      initialSlides={(data as CarouselSlide[]) ?? []}
    />
  );
}
