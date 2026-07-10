"use client";

import { useAuth } from "@/components/auth-provider";
import { InsightCard } from "@/components/insight-card";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/locale-provider";
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
  const t = useT();
  const { user, profile, isAdmin, isMember } = useAuth();
  const supabaseRef = useRef(createClient());
  const [isCreating, setIsCreating] = useState(false);
  const [drafts, setDrafts] = useState<ArticleListItem[]>([]);

  const canWrite = isAdmin || isMember;

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
        title: t.insights.newTitle,
        content: {},
        status: "draft",
      })
      .select()
      .single();
    if (error) {
      toast.error(t.common.createFailed);
      setIsCreating(false);
      return;
    }
    router.push(`/insights/${data.id}?mode=edit`);
  };

  return (
    <PageShell>
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold">{t.insights.heading}</h1>
          <p className="text-sm text-muted-foreground">
            {t.insights.subtitle}
          </p>
        </div>
        {canWrite && (
          <Button variant="secondary" onClick={handleCreate} disabled={isCreating}>
            {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {t.insights.create}
          </Button>
        )}
      </div>

      {articles.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">{t.insights.empty}</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((item) => (
            <InsightCard
              key={item.id}
              article={item}
              href={
                canWrite && item.status === "draft"
                  ? `/insights/${item.id}?mode=edit`
                  : `/insights/${item.id}`
              }
              showDraftBadge={canWrite}
            />
          ))}
        </div>
      )}
    </PageShell>
  );
}
