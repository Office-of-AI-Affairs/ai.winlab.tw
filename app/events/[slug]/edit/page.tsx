import { EventEditClient } from "./client";
import { requireAdminServer } from "@/lib/supabase/require-admin-server";
import type { Event } from "@/lib/supabase/types";
import { redirect } from "next/navigation";

export default async function EventEditPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { supabase } = await requireAdminServer();

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error || !data) {
    redirect("/events");
  }

  return <EventEditClient slug={slug} initialEvent={data as Event} />;
}
