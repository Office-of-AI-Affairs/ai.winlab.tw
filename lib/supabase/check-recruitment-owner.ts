import type { SupabaseClient } from "@supabase/supabase-js";

// Checks whether the viewer owns a specific recruitment. Ownership is the
// per-recruitment gate for edits and applicant visibility; admins bypass this
// at the RLS layer, so callers should check `profile.role === 'admin'` first
// and only call this for non-admins.
export async function isRecruitmentOwner(
  supabase: SupabaseClient,
  userId: string,
  competitionId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("competition_owners")
    .select("user_id")
    .eq("competition_id", competitionId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("isRecruitmentOwner check failed:", error);
    return false;
  }

  return Boolean(data);
}
