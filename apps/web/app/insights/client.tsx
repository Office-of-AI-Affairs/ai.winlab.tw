"use client";

import { AppLink } from "@/components/app-link";
import { useAuth } from "@/components/auth-provider";
import { PageShell } from "@/components/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/date";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { ArticleListItem } from "./data";

export function InsightsPageClient({
  publishedArticles,
}: {
  publishedArticles: ArticleListItem[];
}) {
  const router = useRouter();
  const { user, profile, isAdmin, isMember } = useAuth();
  const supabaseRef = useRef(createClient());
  const [isCreating, setIsCreating] = useState(false);
  const [drafts, setDrafts] = useState<ArticleListItem[]>([]);

  const canWrite = isAdmin || isMember;

  // Drafts merge: admin sees all drafts, member sees own drafts. RLS filters
  // the rest — the client just trusts what the query returns.
  useEffect(() => {
    if (!canWrite) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabaseRef.current
        .from("articles")
        .select("*")
        .eq("status", "draft")
        .order("created_at", { ascending: false });
      if (cancelled) return;
      const rows = (data as ArticleListItem[] | null) ?? [];
      // Hand-fill author_name from current session for own drafts; remote
      // public_profiles lookup happens on publish via the cache regen.
      const ownName = profile?.display_name ?? null;
      setDrafts(
        rows.map((r) => ({
          ...r,
          author_name: r.author_id === user?.id ? ownName : null,
        })),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [canWrite, profile?.display_name, user?.id]);

  const articles = useMemo(() => {
    if (!canWrite || drafts.length === 0) return publishedArticles;
    return [...drafts, ...publishedArticles].sort((a, b) => {
      const aTime = a.published_at ?? a.created_at;
      const bTime = b.published_at ?? b.created_at;
      return bTime.localeCompare(aTime);
    });
  }, [canWrite, drafts, publishedArticles]);

  const handleCreate = async () => {
    if (!user?.id || !canWrite) return;
    setIsCreating(true);
    const { data, error } = await supabaseRef.current
      .from("articles")
      .insert({
        author_id: user.id,
        title: "新文章",
        content: {},
        status: "draft",
      })
      .select()
      .single();
    if (error) {
      toast.error("建立失敗");
      setIsCreating(false);
      return;
    }
    router.push(`/insights/${data.id}/edit`);
  };

  return (
    <PageShell>
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold">觀點</h1>
          <p className="text-sm text-muted-foreground">
            辦公室成員的觀察、筆記與分享。
          </p>
        </div>
        {canWrite && (
          <Button variant="secondary" onClick={handleCreate} disabled={isCreating}>
            {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            新增文章
          </Button>
        )}
      </div>

      {articles.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">尚無文章</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((item) => (
            <AppLink
              key={item.id}
              href={
                canWrite && item.status === "draft"
                  ? `/insights/${item.id}/edit`
                  : `/insights/${item.id}`
              }
              className="group flex flex-col gap-3 rounded-2xl border bg-background p-5 hover:border-foreground/30 hover:shadow-md transition-[border-color,box-shadow] duration-200"
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-lg font-semibold line-clamp-2 group-hover:text-foreground">
                  {item.title || "(無標題)"}
                </h2>
                {canWrite && item.status === "draft" && (
                  <Badge variant="secondary" className="shrink-0">草稿</Badge>
                )}
              </div>
              {item.summary && (
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {item.summary}
                </p>
              )}
              <div className="mt-auto flex items-center justify-between text-xs text-muted-foreground">
                <span>{item.author_name ?? "—"}</span>
                <span>{formatDate(item.published_at ?? item.created_at)}</span>
              </div>
            </AppLink>
          ))}
        </div>
      )}
    </PageShell>
  );
}
