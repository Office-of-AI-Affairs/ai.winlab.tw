import { ResultDetail, type PublisherInfo } from "@/components/result-detail";
import { createClient } from "@/lib/supabase/server";
import type { Result } from "@/lib/supabase/types";
import { ArrowLeft, Pencil } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("results").select("title, summary").eq("id", id).single();
  const title = data?.title ?? "成果";
  return {
    title: `${title}｜人工智慧專責辦公室`,
    description: data?.summary ?? undefined,
  };
}

export default async function EventResultDetailPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("results")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) notFound();

  if (data.status === "draft") {
    const { data: profile } = user
      ? await supabase.from("profiles").select("role").eq("id", user.id).single()
      : { data: null };
    const isAdmin = profile?.role === "admin";
    const isAuthor = data.author_id === user?.id;
    if (!isAdmin && !isAuthor) notFound();
    redirect(`/events/${slug}/results/${id}/edit`);
  }

  const result = data as Result;

  // Determine if current user can edit
  let canEdit = false;
  if (user) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    const isAdmin = profile?.role === "admin";
    const isAuthor = result.author_id === user.id;
    let isTeamLeader = false;
    if (result.type === "team" && result.team_id) {
      const { data: tm } = await supabase.from("team_members").select("role").eq("team_id", result.team_id).eq("user_id", user.id).single();
      isTeamLeader = tm?.role === "leader";
    }
    canEdit = isAdmin || isAuthor || isTeamLeader;
  }

  let publisherInfo: PublisherInfo = null;
  if (result.type === "team" && result.team_id) {
    const { data: team } = await supabase.from("teams").select("name").eq("id", result.team_id).single();
    if (team) publisherInfo = { name: team.name, href: `/team/${result.team_id}` };
  } else if (result.author_id) {
    const { data: profile } = await supabase.from("public_profiles").select("display_name").eq("id", result.author_id).single();
    if (profile) publisherInfo = { name: profile.display_name || "未知使用者", href: `/profile/${result.author_id}` };
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-10">
        <Link
          href={`/events/${slug}?tab=results`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          返回活動
        </Link>
        {canEdit && (
          <Link
            href={`/events/${slug}/results/${id}/edit`}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Pencil className="w-4 h-4" />
            編輯
          </Link>
        )}
      </div>

      <ResultDetail result={result} publisherInfo={publisherInfo} />
    </div>
  );
}
