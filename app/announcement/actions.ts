"use server";

import { updateTag } from "next/cache";

export async function revalidateAnnouncements() {
  updateTag("announcements-published");
}
