import { ProfilePageClient } from "./client";
import { createClient } from "@/lib/supabase/server";
import type { ExternalResult, Profile, Result } from "@/lib/supabase/types";
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

  const [profileRes, resultsRes, externalResultsRes] = await Promise.all([
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
    supabase
      .from("external_results")
      .select("*")
      .eq("user_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (profileRes.error || !profileRes.data) redirect("/");

  const rawResults = (resultsRes.data as Result[]) || [];
  const eventIds = [...new Set(rawResults.map((r) => r.event_id).filter(Boolean))] as string[];
  const eventSlugMap: Record<string, string> = {};
  if (eventIds.length) {
    const { data: events } = await supabase.from("events").select("id, slug").in("id", eventIds);
    for (const e of events ?? []) eventSlugMap[e.id] = e.slug;
  }

  const results = isOwner ? rawResults : rawResults.filter((r) => r.status === "published");
  const externalResults = (externalResultsRes.data as ExternalResult[]) || [];

  return (
    <ProfilePageClient
      initialProfile={profileRes.data as Profile}
      results={results}
      isOwner={isOwner}
      eventSlugMap={eventSlugMap}
      initialExternalResults={externalResults}
    />
  );
}
