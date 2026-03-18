import CarouselEditPageClient from "./client";
import { requireAdminServer } from "@/lib/supabase/require-admin-server";

export default async function CarouselEditPage() {
  await requireAdminServer();
  return <CarouselEditPageClient />;
}
