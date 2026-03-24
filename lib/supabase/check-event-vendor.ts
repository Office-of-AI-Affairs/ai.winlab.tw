import type { SupabaseClient } from "@supabase/supabase-js";

export async function isEventVendor(
  supabase: SupabaseClient,
  userId: string,
  eventId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("event_vendors")
    .select("event_id")
    .eq("user_id", userId)
    .eq("event_id", eventId)
    .single();

  if (error && error.code !== "PGRST116") {
    // PGRST116 = "not found" which is expected for non-vendors
    console.error("isEventVendor check failed:", error);
  }

  return Boolean(data);
}
