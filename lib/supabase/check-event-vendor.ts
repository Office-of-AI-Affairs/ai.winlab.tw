import type { SupabaseClient } from "@supabase/supabase-js";

export async function isEventVendor(
  supabase: SupabaseClient,
  userId: string,
  eventId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("event_vendors")
    .select("event_id")
    .eq("user_id", userId)
    .eq("event_id", eventId)
    .single();
  return Boolean(data);
}
