"use client";

import { useAuth } from "@/components/auth-provider";
import { ResultTagSidebar } from "@/components/result-tag-sidebar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/client";
import type { Result, ResultTag, ResultType, Tag, Team } from "@/lib/supabase/types";
import { Loader2, Plus, User, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { parseAsArrayOf, parseAsString, useQueryState } from "nuqs";
import { useRouter } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";

type ResultWithMeta = Result & {
  author_name?: string | null;
  team_name?: string | null;
};

function ResultPageFallback() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-12 pb-16">
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    </div>
  );
}

function ResultPageContent() {
  const { user, isAdmin } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  const [resultTab, setResultTab] = useState<ResultType>("personal");
  const [results, setResults] = useState<ResultWithMeta[]>([]);
  const [resultTagMap, setResultTagMap] = useState<Record<string, string[]>>({}); // result_id → [tag_ids]
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [tagIdsFromUrl, setTagIdsFromUrl] = useQueryState(
    "tag",
    parseAsArrayOf(parseAsString).withDefault([])
  );
  const selectedTagIds = useMemo(() => new Set(tagIdsFromUrl), [tagIdsFromUrl]);
  const [leaderTeams, setLeaderTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  const fetchResults = useCallback(async () => {
    setIsLoading(true);
    const query = supabase
      .from("results")
      .select("*")
      .eq("type", resultTab)
      .order("date", { ascending: false });

    if (!user) query.eq("status", "published");

    const { data, error } = await query;
    if (error) { setIsLoading(false); return; }

    const rows = (data as Result[]) || [];
    const resultIds = rows.map((r) => r.id);

    const authorIds = [...new Set(rows.map((r) => r.author_id).filter(Boolean))] as string[];
    const teamIds = [...new Set(rows.map((r) => r.team_id).filter(Boolean))] as string[];

    const [profilesRes, teamsRes, tagsRes, resultTagsRes] = await Promise.all([
      authorIds.length
        ? supabase.from("profiles").select("id, display_name").in("id", authorIds)
        : Promise.resolve({ data: [] }),
      teamIds.length
        ? supabase.from("teams").select("id, name").in("id", teamIds)
        : Promise.resolve({ data: [] }),
      supabase.from("tags").select("*").order("sort_order").order("created_at"),
      resultIds.length
        ? supabase.from("result_tags").select("result_id, tag_id").in("result_id", resultIds)
        : Promise.resolve({ data: [] }),
    ]);

    const profileMap = Object.fromEntries(
      ((profilesRes.data || []) as { id: string; display_name: string | null }[]).map((p) => [p.id, p.display_name])
    );
    const teamMap = Object.fromEntries(
      ((teamsRes.data || []) as { id: string; name: string }[]).map((t) => [t.id, t.name])
    );

    // Build result → [tag_ids] map
    const rtMap: Record<string, string[]> = {};
    for (const rt of (resultTagsRes.data as ResultTag[] || [])) {
      if (!rtMap[rt.result_id]) rtMap[rt.result_id] = [];
      rtMap[rt.result_id].push(rt.tag_id);
    }

    setAllTags((tagsRes.data as Tag[]) || []);
    setResultTagMap(rtMap);
    setResults(
      rows.map((r) => ({
        ...r,
        author_name: r.author_id ? profileMap[r.author_id] : null,
        team_name: r.team_id ? teamMap[r.team_id] : null,
      }))
    );
    setIsLoading(false);
  }, [supabase, user, resultTab]);

  useEffect(() => { fetchResults(); }, [fetchResults]);

  const fetchLeaderTeams = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from("team_members").select("team_id").eq("user_id", user.id).eq("role", "leader");
    const ids = (data || []).map((r) => r.team_id);
    if (!ids.length) { setLeaderTeams([]); return; }
    const { data: teams } = await supabase.from("teams").select("*").in("id", ids);
    setLeaderTeams((teams as Team[]) || []);
  }, [supabase, user]);

  useEffect(() => { if (user) fetchLeaderTeams(); }, [user, fetchLeaderTeams]);

  // Compute child tag IDs for a parent (for parent-level filter)
  const childTagIdsOf = useCallback((parentId: string) => {
    return allTags.filter((t) => t.parent_id === parentId).map((t) => t.id);
  }, [allTags]);

  const handleTagToggle = useCallback(
    (tagId: string) => {
      setTagIdsFromUrl((prev) => {
        const set = new Set(prev ?? []);
        if (set.has(tagId)) set.delete(tagId);
        else set.add(tagId);
        return set.size ? Array.from(set) : null;
      });
    },
    [setTagIdsFromUrl]
  );

  const handleClearTags = useCallback(() => {
    setTagIdsFromUrl(null);
  }, [setTagIdsFromUrl]);

  // Filter results based on selected tags
  const filteredResults = useMemo(() => {
    if (selectedTagIds.size === 0) return results;

    // Expand each selected ID: if parent → include its children; if child → itself
    const matchIds = new Set<string>();
    for (const tid of selectedTagIds) {
      const tag = allTags.find((t) => t.id === tid);
      if (!tag) continue;
      if (tag.parent_id === null) {
        for (const cid of childTagIdsOf(tid)) matchIds.add(cid);
      } else {
        matchIds.add(tid);
      }
    }

    return results.filter((r) => {
      const rTags = resultTagMap[r.id] || [];
      return rTags.some((tid) => matchIds.has(tid));
    });
  }, [results, selectedTagIds, allTags, resultTagMap, childTagIdsOf]);

  const handleCreatePersonalResult = async () => {
    if (!user) return;
    setIsCreating(true);
    const { data, error } = await supabase.from("results").insert({
      title: "新成果", date: new Date().toISOString().slice(0, 10),
      header_image: "/placeholder.png", summary: "", content: {},
      status: "draft", author_id: user.id, type: "personal", team_id: null,
    }).select().single();
    if (error) { setIsCreating(false); return; }
    router.push(`/result/${data.id}/edit`);
  };

  const handleCreateTeamResult = async (teamId: string) => {
    if (!user) return;
    setIsCreating(true);
    const { data, error } = await supabase.from("results").insert({
      title: "新成果", date: new Date().toISOString().slice(0, 10),
      header_image: "/placeholder.png", summary: "", content: {},
      status: "draft", author_id: user.id, type: "team", team_id: teamId,
    }).select().single();
    if (error) { setIsCreating(false); return; }
    router.push(`/result/${data.id}/edit`);
  };

  const isExternalImage = (src: string | null | undefined) =>
    !!(src && (src.startsWith("http://") || src.startsWith("https://")));

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 pb-16">
      {/* Page title */}
      <div className="flex items-center justify-between gap-4 mb-8">
        <h1 className="text-3xl font-bold">最新成果</h1>
        {user && (
          <div className="flex items-center gap-2">
            {resultTab === "personal" ? (
              <Button variant="secondary" onClick={handleCreatePersonalResult} disabled={isCreating}>
                {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                新增個人成果
              </Button>
            ) : leaderTeams.length === 0 ? (
              <span className="text-sm text-muted-foreground">請先建立隊伍並擔任組長才能新增團隊成果</span>
            ) : (
              <select
                className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                value=""
                onChange={(e) => { if (e.target.value) handleCreateTeamResult(e.target.value); }}
                disabled={isCreating}
              >
                <option value="">選擇隊伍新增團隊成果…</option>
                {leaderTeams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            )}
          </div>
        )}
      </div>

      {/* Two-column layout */}
      <div className="flex gap-6 items-start">
        {/* Sidebar */}
        <div className="hidden md:block w-48 shrink-0 sticky top-24">
          <ResultTagSidebar
            selectedTagIds={selectedTagIds}
            onToggle={handleTagToggle}
            onClear={handleClearTags}
            isAdmin={isAdmin}
          />
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0 flex flex-col gap-6">
          {/* Mobile tag selector */}
          <div className="md:hidden">
            <ResultTagSidebar
              selectedTagIds={selectedTagIds}
              onToggle={handleTagToggle}
              onClear={handleClearTags}
              isAdmin={isAdmin}
            />
            <div className="mt-4 border-b" />
          </div>

          {/* Tabs */}
          <div className="flex gap-2 border-b border-border pb-2">
            <Button variant={resultTab === "personal" ? "default" : "ghost"} size="sm" onClick={() => setResultTab("personal")}>個人</Button>
            <Button variant={resultTab === "team" ? "default" : "ghost"} size="sm" onClick={() => setResultTab("team")}>團隊</Button>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredResults.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {selectedTagIds.size > 0 ? "此標籤下尚無成果" : "目前沒有成果"}
            </div>
          ) : (
            <div className="grid lg:grid-cols-3 md:grid-cols-2 grid-cols-1 gap-6">
              {filteredResults.map((item) => {
                const card = <ResultCard item={item} isExternalImage={isExternalImage} />;
                return user ? (
                  <button type="button" key={item.id} className="text-left w-full h-full"
                    onClick={() => router.push(`/result/${item.id}/edit`)}>
                    {card}
                  </button>
                ) : (
                  <Link href={`/result/${item.id}`} key={item.id} className="h-full">{card}</Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResultPage() {
  return (
    <Suspense fallback={<ResultPageFallback />}>
      <ResultPageContent />
    </Suspense>
  );
}

function ResultCard({ item, isExternalImage }: {
  item: ResultWithMeta;
  isExternalImage: (src: string | null | undefined) => boolean;
}) {
  const publisherName = item.type === "team" ? item.team_name || "未知隊伍" : item.author_name || "匿名";
  return (
    <Card className="py-0 h-full flex flex-col transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98] overflow-hidden">
      <div className="relative w-full aspect-video shrink-0">
        <Image src={item.header_image || "/placeholder.png"} alt={item.title} fill
          className="object-cover" unoptimized={isExternalImage(item.header_image)} />
      </div>
      <CardHeader className="shrink-0 pb-2">
        <CardTitle className="text-xl font-bold line-clamp-2">{item.title || "(無標題)"}</CardTitle>
        <Separator />
      </CardHeader>
      <CardContent className="flex-1">
        <p className="line-clamp-3 text-muted-foreground text-sm">{item.summary || "（無摘要）"}</p>
      </CardContent>
      <CardFooter className="pt-0 pb-4">
        <div className="flex items-center justify-between w-full gap-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5 min-w-0">
            {item.type === "team" ? <Users className="w-3.5 h-3.5 shrink-0" /> : <User className="w-3.5 h-3.5 shrink-0" />}
            <span className="truncate">{publisherName}</span>
          </div>
          <span className="shrink-0">{item.date || "—"}</span>
        </div>
      </CardFooter>
    </Card>
  );
}
