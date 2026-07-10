"use server";

import { updateTag } from "next/cache";

// Fired from admin event edit flow to immediately drop the pinned-events
// cache so the Header reflects pin/publish/delete changes on next fetch.
export async function revalidatePinnedEvents() {
  updateTag("pinned-events");
}

export async function revalidateEvents() {
  updateTag("events-published");
}

// Convenience: admin edits of an event can affect both the Header pin list
// and the /events list, so drop both caches in one call.
export async function revalidateAllEventCaches() {
  updateTag("pinned-events");
  updateTag("events-published");
}
