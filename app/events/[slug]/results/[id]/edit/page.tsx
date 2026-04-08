import EventResultEditPageClient from "./client";
import { getViewer } from "@/lib/supabase/get-viewer";
import type { Result, PublicProfile } from "@/lib/supabase/types";
import { redirect } from "next/navigation";

export default async function EventResultEditPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const { supabase, user, isAdmin } = await getViewer();

  if (!user) {
    redirect("/login");
  }

  const { data } = await supabase.from("results").select("*").eq("id", id).single();
  if (!data) {
    redirect(`/events/${slug}?tab=results`);
  }

  let canEdit = isAdmin || data.author_id === user.id;
  if (!canEdit && data.type === "team" && data.team_id) {
    const { data: membership } = await supabase
      .from("team_members")
      .select("role")
      .eq("team_id", data.team_id)
      .eq("user_id", user.id)
      .single();
    canEdit = membership?.role === "leader";
  }

  if (!canEdit) {
    redirect(`/events/${slug}?tab=results`);
  }

  const result = {
    ...data,
    type: (data as Result).type ?? "personal",
    team_id: (data as Result).team_id ?? null,
  } as Result;

  // Fetch existing co-authors
  let initialCoauthors: PublicProfile[] = [];
  const { data: coauthorRows } = await supabase
    .from("result_coauthors")
    .select("user_id")
    .eq("result_id", id);
  if (coauthorRows?.length) {
    const userIds = coauthorRows.map((r) => r.user_id);
    const { data: profiles } = await supabase
      .from("public_profiles")
      .select("id, created_at, updated_at, display_name")
      .in("id", userIds);
    initialCoauthors = (profiles as PublicProfile[]) ?? [];
  }

  return (
    <EventResultEditPageClient
      id={id}
      slug={slug}
      initialResult={result}
      initialCoauthors={initialCoauthors}
    />
  );
}
