import { CarouselEditClient } from "./client";
import { requireAdminServer } from "@/lib/supabase/require-admin-server";
import type { CarouselSlide } from "@/lib/supabase/types";
import { redirect } from "next/navigation";

export default async function CarouselEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireAdminServer();

  const { data, error } = await supabase
    .from("carousel_slides")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    redirect("/carousel");
  }

  return <CarouselEditClient id={id} initialSlide={data as CarouselSlide} />;
}
