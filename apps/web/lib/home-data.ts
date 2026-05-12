import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import type { CarouselSlide, Contact } from "@/lib/supabase/types";

export const getCarouselSlides = unstable_cache(
  async (): Promise<CarouselSlide[]> => {
    const supabase = createPublicClient();
    const { data } = await supabase
      .from("carousel_slides")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    return (data as CarouselSlide[] | null) ?? [];
  },
  ["carousel-slides"],
  { tags: ["carousel-slides"], revalidate: 3600 },
);

export const getContacts = unstable_cache(
  async (): Promise<Contact[]> => {
    const supabase = createPublicClient();
    const { data } = await supabase
      .from("contacts")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    return (data as Contact[] | null) ?? [];
  },
  ["contacts"],
  { tags: ["contacts"], revalidate: 3600 },
);
