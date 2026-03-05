import { ProfilePageClient } from "./client";
import { createClient } from "@/lib/supabase/server";
import type { Profile, Result } from "@/lib/supabase/types";
import { redirect } from "next/navigation";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const isOwner = user?.id === id;

  const [profileRes, resultsRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, display_name, avatar_url, bio, phone, linkedin, facebook, github, website, resume, social_links")
      .eq("id", id)
      .single(),
    supabase
      .from("results")
      .select("*")
      .eq("author_id", id)
      .eq("type", "personal")
      .order("date", { ascending: false }),
  ]);

  if (profileRes.error || !profileRes.data) redirect("/");

  const allResults = (resultsRes.data as Result[]) || [];
  const results = isOwner ? allResults : allResults.filter((r) => r.status === "published");

  return (
    <ProfilePageClient
      initialProfile={profileRes.data as Profile}
      results={results}
      isOwner={isOwner}
    />
  );
}
