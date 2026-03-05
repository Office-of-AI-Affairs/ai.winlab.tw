import { AnnouncementPageClient } from "./client";
import { createClient } from "@/lib/supabase/server";
import type { Announcement } from "@/lib/supabase/types";

export default async function AnnouncementPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let isAdmin = false;
  if (user) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    isAdmin = profile?.role === "admin";
  }

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
