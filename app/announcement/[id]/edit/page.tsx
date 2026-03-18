import { AnnouncementEditClient } from "./client";
import { requireAdminServer } from "@/lib/supabase/require-admin-server";
import type { Announcement } from "@/lib/supabase/types";
import { redirect } from "next/navigation";

export default async function AnnouncementEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await requireAdminServer();

  const { data, error } = await supabase
    .from("announcements")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    redirect("/announcement");
  }

  return <AnnouncementEditClient id={id} initialAnnouncement={data as Announcement} />;
}
