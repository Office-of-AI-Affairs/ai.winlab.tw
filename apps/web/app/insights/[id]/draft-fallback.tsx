"use client";

import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import type { Article } from "@winlab/db";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type State =
  | { kind: "loading" }
  | { kind: "found"; article: Article }
  | { kind: "missing" };

/**
 * Hit when the public lookup couldn't find a published article. If the viewer
 * is the author or an admin, RLS lets them read the draft — we redirect
 * straight into edit mode. Everyone else gets a 404.
 */
export function InsightDraftFallback({ id }: { id: string }) {
  const router = useRouter();
  const { user, isAdmin, isMember, isLoading } = useAuth();
  const [state, setState] = useState<State>({ kind: "loading" });
  const supabaseRef = useRef(createClient());

  const canCheck = isAdmin || isMember;

  useEffect(() => {
    if (isLoading || !canCheck) return;
    let cancelled = false;
    void (async () => {
      const { data } = await supabaseRef.current
        .from("articles")
        .select("*")
        .eq("id", id)
        .single();
      if (cancelled) return;
      if (!data) {
        setState({ kind: "missing" });
        return;
      }
      const article = data as Article;
      const isOwner = isAdmin || article.author_id === user?.id;
      if (!isOwner) {
        setState({ kind: "missing" });
        return;
      }
      setState({ kind: "found", article });
      router.replace(`/insights/${id}/edit`);
    })();
    return () => {
      cancelled = true;
    };
  }, [id, canCheck, isAdmin, isLoading, router, user?.id]);

  // Viewers without admin/member can't read drafts (RLS would block them too).
  // Render 404 immediately instead of probing.
  if (!isLoading && !canCheck) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20">
        <div className="flex flex-col items-center gap-4">
          <h1 className="text-2xl font-bold">找不到這篇文章</h1>
          <p className="text-muted-foreground">可能已被移除、尚未發布，或網址有誤。</p>
          <Button asChild variant="secondary">
            <Link href="/insights">返回觀點列表</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading || state.kind === "loading" || state.kind === "found") {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12 flex flex-col gap-6">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-20">
      <div className="flex flex-col items-center gap-4">
        <h1 className="text-2xl font-bold">找不到這篇文章</h1>
        <p className="text-muted-foreground">可能已被移除、尚未發布，或網址有誤。</p>
        <Button asChild variant="secondary">
          <Link href="/insights">返回觀點列表</Link>
        </Button>
      </div>
    </div>
  );
}
