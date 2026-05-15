"use client";

import { revalidateInsights } from "@/app/insights/actions";
import { TiptapEditor } from "@/components/tiptap-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAutoSave } from "@/hooks/use-auto-save";
import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Article } from "@winlab/db";
import { ArrowLeft, Loader2, LogOut, Send, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type ArticleDraft = {
  title: string;
  summary: string;
  cover_image_url: string;
  content: Record<string, unknown>;
  status: string;
  published_at: string | null;
};

function toDraft(a: Article): ArticleDraft {
  return {
    title: a.title,
    summary: a.summary ?? "",
    cover_image_url: a.cover_image_url ?? "",
    content: a.content,
    status: a.status,
    published_at: a.published_at,
  };
}

export function InsightEditClient({ initialArticle }: { initialArticle: Article }) {
  const router = useRouter();
  const supabaseRef = useRef(createClient() as unknown as SupabaseClient);
  const [draft, setDraft] = useState<ArticleDraft>(() => toDraft(initialArticle));
  const [saved, setSaved] = useState<ArticleDraft>(() => toDraft(initialArticle));
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const hasChanges =
    JSON.stringify(draft) !== JSON.stringify(saved);

  const save = useCallback(async () => {
    setIsSaving(true);
    const payload = {
      title: draft.title,
      summary: draft.summary || null,
      cover_image_url: draft.cover_image_url || null,
      content: draft.content,
    };
    const { error } = await supabaseRef.current
      .from("articles")
      .update(payload)
      .eq("id", initialArticle.id);
    if (error) {
      toast.error("儲存失敗");
    } else {
      setSaved(draft);
      await revalidateInsights();
    }
    setIsSaving(false);
  }, [draft, initialArticle.id]);

  useAutoSave({ hasChanges, onSave: save });

  const publish = useCallback(async () => {
    setIsPublishing(true);
    const nextStatus = draft.status === "published" ? "draft" : "published";
    const payload: Record<string, unknown> = {
      title: draft.title,
      summary: draft.summary || null,
      cover_image_url: draft.cover_image_url || null,
      content: draft.content,
      status: nextStatus,
    };
    if (nextStatus === "published" && !draft.published_at) {
      payload.published_at = new Date().toISOString();
    }
    const { error } = await supabaseRef.current
      .from("articles")
      .update(payload)
      .eq("id", initialArticle.id);
    if (error) {
      toast.error("發布失敗");
      setIsPublishing(false);
      return;
    }
    const next: ArticleDraft = {
      ...draft,
      status: nextStatus,
      published_at: (payload.published_at as string | undefined) ?? draft.published_at,
    };
    setDraft(next);
    setSaved(next);
    toast.success(nextStatus === "published" ? "已發布" : "已取消發布");
    await revalidateInsights();
    setIsPublishing(false);
  }, [draft, initialArticle.id]);

  const remove = useCallback(async () => {
    if (!confirm("確定要刪除這篇文章嗎？此動作無法復原。")) return;
    setIsDeleting(true);
    const { error } = await supabaseRef.current
      .from("articles")
      .delete()
      .eq("id", initialArticle.id);
    if (error) {
      toast.error("刪除失敗");
      setIsDeleting(false);
      return;
    }
    await revalidateInsights();
    router.push("/insights");
  }, [initialArticle.id, router]);

  // ⌘S forces immediate save
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey)) return;
      if (event.key.toLowerCase() !== "s") return;
      event.preventDefault();
      if (hasChanges && !isSaving) void save();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hasChanges, isSaving, save]);

  useEffect(() => {
    if (!hasChanges) return;
    const handler = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasChanges]);

  const statusLabel =
    isDeleting ? "刪除中…"
      : isPublishing ? (draft.status === "published" ? "取消發布中…" : "發布中…")
      : isSaving ? "儲存中…"
      : hasChanges ? "尚未儲存"
      : draft.status === "published" ? "已發布"
      : "草稿";

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <Link
          href={`/insights/${initialArticle.id}`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
        >
          <ArrowLeft className="w-4 h-4" />
          返回文章
        </Link>
        <span className="text-sm text-muted-foreground">{statusLabel}</span>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="article-title">標題</Label>
        <Input
          id="article-title"
          value={draft.title}
          onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))}
          placeholder="輸入標題…"
          disabled={isSaving || isPublishing || isDeleting}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="article-summary">摘要（選填）</Label>
        <Textarea
          id="article-summary"
          value={draft.summary}
          onChange={(e) => setDraft((p) => ({ ...p, summary: e.target.value }))}
          placeholder="一段話介紹這篇文章…"
          rows={2}
          disabled={isSaving || isPublishing || isDeleting}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="article-cover">封面圖 URL（選填）</Label>
        <Input
          id="article-cover"
          value={draft.cover_image_url}
          onChange={(e) => setDraft((p) => ({ ...p, cover_image_url: e.target.value }))}
          placeholder="https://…"
          disabled={isSaving || isPublishing || isDeleting}
        />
        <p className="text-xs text-muted-foreground">
          留空會自動從文章內第一張圖取用。可在下方編輯器中先上傳圖片、複製 URL。
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label>內容</Label>
        <TiptapEditor
          content={draft.content}
          onChange={(content) => setDraft((p) => ({ ...p, content }))}
        />
      </div>

      <div className="sticky bottom-4 z-10 mt-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border bg-background/95 px-4 py-3 shadow-lg backdrop-blur-sm">
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={remove}
          disabled={isSaving || isPublishing || isDeleting}
        >
          {isDeleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
          刪除
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            asChild
          >
            <Link href={`/insights/${initialArticle.id}`}>
              <LogOut className="size-4" />
              退出編輯
            </Link>
          </Button>
          <Button
            type="button"
            variant={draft.status === "published" ? "outline" : "default"}
            size="sm"
            onClick={publish}
            disabled={isSaving || isPublishing || isDeleting}
          >
            {isPublishing ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            {draft.status === "published" ? "取消發布" : "發布"}
          </Button>
        </div>
      </div>
    </div>
  );
}
