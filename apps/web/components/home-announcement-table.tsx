"use client";

import { AnnouncementTable } from "@/components/announcement-table";
import type { Announcement } from "@/lib/supabase/types";

export function HomeAnnouncementTable({
  announcements,
}: {
  announcements: Announcement[];
}) {
  return (
    <AnnouncementTable
      announcements={announcements}
      getHref={(item) => `/announcement/${item.id}`}
    />
  );
}
