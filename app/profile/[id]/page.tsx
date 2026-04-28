import { ProfilePageClient } from "./client";
import { composeProfile } from "@/lib/profile-records";
import { createPublicClient } from "@/lib/supabase/public";
import { getViewer } from "@/lib/supabase/get-viewer";
import type { ExternalResult, Profile, PublicProfile, Result } from "@/lib/supabase/types";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("public_profiles")
    .select("display_name")
    .eq("id", id)
    .maybeSingle();
  const name = data?.display_name?.trim() || "成員";
  const title = `${name}｜人工智慧專責辦公室`;
  const description = `${name} 的個人頁面 — 國立陽明交通大學人工智慧專責辦公室成員與研究成果。`;
  return {
    title,
    description,
    alternates: { canonical: `/profile/${id}` },
    openGraph: {
      title,
      description,
      url: `/profile/${id}`,
    },
    twitter: { card: "summary_large_image" },
  };
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, user, isAdmin } = await getViewer();

  const isOwner = user?.id === id;
  const canViewPrivateProfile = Boolean(user);

  const [publicProfileRes, privateProfileRes, resultsRes, externalResultsRes, coauthoredRes, participantsRes] = await Promise.all([
    supabase
      .from("public_profiles")
      .select("id, created_at, updated_at, display_name, avatar_url")
      .eq("id", id)
      .single(),
    canViewPrivateProfile
      ? supabase
          .from("profiles")
          .select("id, created_at, updated_at, display_name, avatar_url, role, bio, phone, linkedin, facebook, github, website, resume, social_links")
          .eq("id", id)
          .single()
      : Promise.resolve({ data: null, error: null }),
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
    supabase
      .from("result_coauthors")
      .select("result_id")
      .eq("user_id", id),
    isOwner
      ? supabase
          .from("event_participants")
          .select("event_id")
          .eq("user_id", id)
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (publicProfileRes.error || !publicProfileRes.data) redirect("/");

  const authoredResults = (resultsRes.data as Result[]) || [];
  const coauthorResultIds = (coauthoredRes.data ?? []).map((r) => r.result_id);
  let coauthoredResults: Result[] = [];
  if (coauthorResultIds.length) {
    const { data: coResults } = await supabase
      .from("results")
      .select("*")
      .in("id", coauthorResultIds)
      .order("date", { ascending: false });
    coauthoredResults = (coResults as Result[]) ?? [];
  }

  const authoredIds = new Set(authoredResults.map((r) => r.id));
  const rawResults = [
    ...authoredResults,
    ...coauthoredResults.filter((r) => !authoredIds.has(r.id)),
  ];
  const eventIds = [...new Set(rawResults.map((r) => r.event_id).filter(Boolean))] as string[];

  const participantEventIds = (participantsRes.data ?? []).map((p: { event_id: string }) => p.event_id);
  const allEventIds = [...new Set([...eventIds, ...participantEventIds])];

  const eventSlugMap: Record<string, string> = {};
  const eventNameMap: Record<string, string> = {};
  let participatedEvents: { id: string; name: string; slug: string }[] = [];

  if (allEventIds.length) {
    const { data: events } = await supabase
      .from("events")
      .select("id, name, slug")
      .in("id", allEventIds);
    for (const e of events ?? []) {
      eventSlugMap[e.id] = e.slug;
      eventNameMap[e.id] = e.name;
    }
  }

  if (isOwner) {
    if (isAdmin) {
      const { data: allEvents } = await supabase
        .from("events")
        .select("id, name, slug")
        .eq("status", "published")
        .order("sort_order", { ascending: true });
      participatedEvents = (allEvents ?? []).map((e) => ({ id: e.id, name: e.name, slug: e.slug }));
      for (const e of allEvents ?? []) {
        eventSlugMap[e.id] = e.slug;
        eventNameMap[e.id] = e.name;
      }
    } else {
      participatedEvents = Object.entries(eventNameMap)
        .filter(([id]) => participantEventIds.includes(id))
        .map(([id, name]) => ({ id, name, slug: eventSlugMap[id] }));
    }
  }

  const results = isOwner ? rawResults : rawResults.filter((r) => r.status === "published");
  const externalResults = (externalResultsRes.data as ExternalResult[]) || [];
  const visibleProfile = composeProfile(
    publicProfileRes.data as PublicProfile,
    privateProfileRes.data as Partial<Profile> | null
  );

  return (
    <ProfilePageClient
      initialProfile={visibleProfile}
      results={results}
      isOwner={isOwner}
      canViewPrivateProfile={canViewPrivateProfile}
      eventSlugMap={eventSlugMap}
      eventNameMap={eventNameMap}
      participatedEvents={participatedEvents}
      initialExternalResults={externalResults}
    />
  );
}
