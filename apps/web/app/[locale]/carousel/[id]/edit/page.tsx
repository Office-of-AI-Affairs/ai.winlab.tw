import { CarouselEditClient } from "./client";
import { requireAdmin } from "@/lib/auth/viewer";
import { db } from "@/lib/db";
import { carousel_slides } from "@/lib/db/schema";
import { isUuid } from "@/lib/slug";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

export default async function CarouselEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAdmin();
  if (!isUuid(id)) redirect("/carousel");

  const [slide] = await db.select().from(carousel_slides).where(eq(carousel_slides.id, id)).limit(1);
  if (!slide) redirect("/carousel");

  return <CarouselEditClient id={id} initialSlide={slide} />;
}
