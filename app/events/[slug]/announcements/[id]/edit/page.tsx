import EventAnnouncementEditPageClient from "./client";
import { requireAdminServer } from "@/lib/supabase/require-admin-server";

export default async function EventAnnouncementEditPage() {
  await requireAdminServer();
  return <EventAnnouncementEditPageClient />;
}
