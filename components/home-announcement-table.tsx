"use client";

import { AnnouncementTable } from "@/components/announcement-table";
import type { Announcement } from "@/lib/supabase/types";
import { useRouter } from "next/navigation";

export function HomeAnnouncementTable({
  announcements,
}: {
  announcements: Announcement[];
}) {
  const router = useRouter();
  return (
    <AnnouncementTable
      announcements={announcements}
      onRowClick={(item) => router.push(`/announcement/${item.id}`)}
    />
  );
}
