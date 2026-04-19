"use server";

import { updateTag } from "next/cache";

// Fired from admin event edit flow to immediately drop the pinned-events
// cache so the Header reflects pin/publish/delete changes on next fetch.
export async function revalidatePinnedEvents() {
  updateTag("pinned-events");
}
