import { CarouselPageClient } from "./client";
import { requireAdmin } from "@/lib/auth/viewer";
import { db } from "@/lib/db";
import { carousel_slides } from "@/lib/db/schema";
import { asc } from "drizzle-orm";

export default async function CarouselPage() {
  await requireAdmin();
  const slides = await db
    .select()
    .from(carousel_slides)
    .orderBy(asc(carousel_slides.sort_order), asc(carousel_slides.created_at));

  return <CarouselPageClient initialSlides={slides} />;
}
