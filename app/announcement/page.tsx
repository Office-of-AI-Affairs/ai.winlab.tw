import { AnnouncementPageClient } from "./client";
import { getViewer } from "@/lib/supabase/get-viewer";
import type { Announcement } from "@/lib/supabase/types";

export default async function AnnouncementPage() {
  const { supabase, user, isAdmin } = await getViewer();

  const query = supabase
    .from("announcements")
    .select("*")
    .is("event_id", null)
    .order("date", { ascending: false });
  if (!isAdmin) query.eq("status", "published");
  const { data: announcements } = await query;

  return (
    <AnnouncementPageClient
      announcements={(announcements as Announcement[]) ?? []}
      isAdmin={isAdmin}
      userId={user?.id ?? null}
    />
  );
}
