import { createClient } from "@/lib/supabase/server";
import type { Result } from "@/lib/supabase/types";
import { Users } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("teams").select("name").eq("id", id).single();
  const name = data?.name ?? "隊伍";
  return {
    title: `${name}｜人工智慧專責辦公室`,
    description: `${name} 的公開隊伍頁面，展示隊伍成果與相關活動內容。`,
  };
}

export default async function TeamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [teamRes, resultsRes] = await Promise.all([
    supabase.from("teams").select("id, name, description").eq("id", id).single(),
    supabase.from("results").select("*").eq("team_id", id).eq("status", "published").eq("type", "team").order("date", { ascending: false }),
  ]);

  if (teamRes.error || !teamRes.data) notFound();

  const team = teamRes.data;
  const results = (resultsRes.data as Result[]) || [];
  const eventIds = [...new Set(results.map((r) => r.event_id).filter(Boolean))] as string[];
  const eventSlugMap: Record<string, string> = {};
  if (eventIds.length) {
    const { data: events } = await supabase.from("events").select("id, slug").in("id", eventIds);
    for (const e of events ?? []) eventSlugMap[e.id] = e.slug;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      {/* Team header */}
      <div className="flex items-center gap-4 mb-10">
        <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center shrink-0">
          <Users className="w-6 h-6 text-muted-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">{team.name}</h1>
          {team.description && (
            <p className="text-sm text-muted-foreground mt-0.5">{team.description}</p>
          )}
          <p className="text-sm text-muted-foreground mt-0.5">{results.length} 篇成果</p>
        </div>
      </div>

      <hr className="mb-10" />

      {/* Results list */}
      {results.length === 0 ? (
        <p className="text-muted-foreground">尚無已發布的成果。</p>
      ) : (
        <div className="flex flex-col divide-y">
          {results.map((result) => {
            const href =
              result.event_id && eventSlugMap[result.event_id]
                ? `/events/${eventSlugMap[result.event_id]}/results/${result.id}`
                : null;

            const content = (
              <>
                <p className="text-sm text-muted-foreground">{result.date}</p>
                <h2 className="text-xl font-semibold group-hover:underline underline-offset-2">{result.title}</h2>
                {result.summary && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">{result.summary}</p>
                )}
              </>
            );

            return href ? (
              <Link
                key={result.id}
                href={href}
                className="py-6 group flex flex-col gap-1 hover:bg-muted/30 -mx-4 px-4 transition-colors rounded-lg"
              >
                {content}
              </Link>
            ) : (
              <div
                key={result.id}
                className="py-6 flex flex-col gap-1 -mx-4 px-4 rounded-lg"
              >
                {content}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
