"use client";

import { revalidateInsights } from "@/app/insights/actions";
import type { ArticleListItem } from "@/app/insights/data";
import { useAuth } from "@/components/auth-provider";
import { EditActionsPill, type EditStatus } from "@/components/edit-actions-pill";
import { EditModeToggle } from "@/components/edit-mode-toggle";
import { JsonLd } from "@/components/json-ld";
import { RichTextSurface } from "@/components/rich-text-surface";
import { ShareButtons } from "@/components/share-buttons";
import { Toc } from "@/components/toc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useContentEditor } from "@/hooks/use-content-editor";
import { useEditMode } from "@/hooks/use-edit-mode";
import { formatDate } from "@/lib/date";
import { buildBreadcrumbJsonLd } from "@/lib/seo/breadcrumb";
import type { TocItem } from "@/lib/ui/article";
import { ArrowLeft, Loader2, LogOut, Send, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  initialArticle: ArticleListItem;
  initialContentHtml: string | null;
  initialToc: TocItem[];
  readingTimeMin: number;
  /** Default mode on mount — draft fallback opens straight in edit. */
  initialMode?: "view" | "edit";
};

export function InsightArticleClient({
  initialArticle,
  initialContentHtml,
  initialToc,
  readingTimeMin,
  initialMode,
}: Props) {
  const router = useRouter();
  const { user, isAdmin, isMember } = useAuth();
  const canEdit = isAdmin || (isMember && user?.id === initialArticle.author_id);
  const { isEditing, setMode } = useEditMode({ enabled: canEdit });
  const didApplyInitialMode = useRef(false);

  useEffect(() => {
    if (didApplyInitialMode.current) return;
    if (initialMode === "edit" && canEdit) setMode("edit");
    didApplyInitialMode.current = true;
  }, [initialMode, canEdit, setMode]);

  const {
    data: article,
    setData: setArticle,
    hasChanges,
    isSaving,
    isPublishing,
    isDeleting,
    save,
    publish,
    remove,
  } = useContentEditor({
    table: "articles",
    id: initialArticle.id,
    initialData: initialArticle,
    fields: ["title", "summary", "cover_image_url", "content"],
    redirectTo: "/insights",
    onAfterSave: revalidateInsights,
    onAfterPublish: revalidateInsights,
    onAfterRemove: revalidateInsights,
  });

  const [renderedHtml, setRenderedHtml] = useState<string | null>(initialContentHtml);
  const [toc, setToc] = useState<TocItem[]>(initialToc);
  const [actionsOpen, setActionsOpen] = useState(false);

  // After a save lands, regenerate HTML so view-mode reflects latest content.
  const isInitialRender = useRef(true);
  useEffect(() => {
    if (isInitialRender.current) {
      isInitialRender.current = false;
      return;
    }
    if (hasChanges) return;
    let cancelled = false;
    void (async () => {
      const { renderArticle } = await import("@/lib/ui/rich-text");
      if (cancelled) return;
      const { html, toc: nextToc } = renderArticle(
        article.content as Record<string, unknown> | null,
      );
      setRenderedHtml(html);
      setToc(nextToc);
    })();
    return () => {
      cancelled = true;
    };
  }, [hasChanges, article.content]);

  const exitEdit = useCallback(() => {
    if (hasChanges && !window.confirm("你有尚未儲存的變更，確定要離開嗎？")) return;
    setActionsOpen(false);
    setMode("view");
  }, [hasChanges, setMode]);

  // ⌘S — force immediate save (skip 3s debounce).
  useEffect(() => {
    if (!isEditing) return;
    const onKey = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey)) return;
      if (event.key.toLowerCase() !== "s") return;
      event.preventDefault();
      if (hasChanges && !isSaving) void save();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isEditing, hasChanges, isSaving, save]);

  useEffect(() => {
    if (!isEditing || !hasChanges) return;
    const handler = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isEditing, hasChanges]);

  const status: EditStatus =
    isSaving || isPublishing || isDeleting
      ? "saving"
      : hasChanges
        ? "dirty"
        : "saved";
  const statusLabel = isDeleting
    ? "刪除中…"
    : isPublishing
      ? article.status === "published"
        ? "取消發布中…"
        : "發布中…"
      : isSaving
        ? "儲存中…"
        : hasChanges
          ? "尚未儲存"
          : article.status === "published"
            ? "已發布"
            : "草稿";

  const titleClass = "text-4xl font-extrabold tracking-tight text-balance mb-4";

  const sharePath = `/insights/${initialArticle.id}`;
  const shareUrl = `https://ai.winlab.tw${sharePath}`;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    datePublished: article.published_at ?? article.created_at,
    dateModified: article.updated_at,
    author: initialArticle.author_name
      ? { "@type": "Person", name: initialArticle.author_name }
      : undefined,
    url: shareUrl,
    publisher: {
      "@type": "Organization",
      name: "國立陽明交通大學 人工智慧專責辦公室",
      url: "https://ai.winlab.tw",
    },
  };

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "首頁", path: "/" },
    { name: "觀點", path: "/insights" },
    { name: article.title, path: sharePath },
  ]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <JsonLd data={structuredData} />
      <JsonLd data={breadcrumbJsonLd} />

      <div className="mb-10 flex items-center justify-between gap-4">
        <Link
          href="/insights"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
        >
          <ArrowLeft className="w-4 h-4" />
          返回列表
        </Link>
        <ShareButtons url={sharePath} title={article.title} />
      </div>

      {article.cover_image_url && !isEditing && (
        <div className="mb-8 overflow-hidden rounded-2xl border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={article.cover_image_url}
            alt={article.title}
            loading="lazy"
            className="w-full h-auto object-cover"
          />
        </div>
      )}

      <div className="mb-8 max-w-6xl">
        {isEditing ? (
          <input
            value={article.title ?? ""}
            onChange={(event) =>
              setArticle((prev) => ({ ...prev, title: event.target.value }))
            }
            placeholder="輸入標題…"
            aria-label="標題"
            className={`${titleClass} w-full border-0 bg-transparent p-0 outline-none focus:outline-none placeholder:text-muted-foreground/60`}
          />
        ) : (
          <h1 className={titleClass}>{article.title}</h1>
        )}
        {!isEditing && article.summary && (
          <p className="text-lg text-muted-foreground mb-4">{article.summary}</p>
        )}
        <div className="flex flex-wrap items-center gap-2 text-base text-muted-foreground">
          {initialArticle.author_name && (
            <>
              <span>{initialArticle.author_name}</span>
              <span aria-hidden className="opacity-30">·</span>
            </>
          )}
          <span>{formatDate(article.published_at ?? article.created_at)}</span>
          {readingTimeMin ? (
            <>
              <span aria-hidden className="opacity-30">·</span>
              <span>閱讀 {readingTimeMin} 分鐘</span>
            </>
          ) : null}
        </div>
      </div>

      <hr className="mb-8" />

      <div className="max-w-6xl lg:flex lg:items-start lg:gap-8">
        <div className="min-w-0 flex-1">
          <RichTextSurface
            content={article.content as Record<string, unknown> | null}
            contentHtml={renderedHtml}
            editing={isEditing}
            onChange={(content) =>
              setArticle((prev) => ({ ...prev, content }))
            }
            emptyText="（無內容）"
          />
        </div>
        <Toc items={toc} className="hidden lg:block" />
      </div>

      {canEdit && !isEditing && <EditModeToggle onClick={() => setMode("edit")} />}

      {isEditing && (
        <EditActionsPill
          status={status}
          statusLabel={statusLabel}
          title="管理文章"
          open={actionsOpen}
          onOpenChange={setActionsOpen}
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="article-summary" className="text-sm">摘要</Label>
            <Textarea
              id="article-summary"
              value={(article.summary as string | null) ?? ""}
              onChange={(event) =>
                setArticle((prev) => ({ ...prev, summary: event.target.value }))
              }
              placeholder="一段話介紹這篇文章…"
              rows={2}
              disabled={isSaving || isPublishing || isDeleting}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="article-cover" className="text-sm">封面圖 URL</Label>
            <Input
              id="article-cover"
              value={(article.cover_image_url as string | null) ?? ""}
              onChange={(event) =>
                setArticle((prev) => ({ ...prev, cover_image_url: event.target.value }))
              }
              placeholder="https://…（留空時自動取文章內第一張圖）"
              disabled={isSaving || isPublishing || isDeleting}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={async () => {
                await remove();
                router.push("/insights");
              }}
              disabled={isSaving || isPublishing || isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              刪除文章
            </Button>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={exitEdit}
                disabled={isSaving || isPublishing || isDeleting}
              >
                <LogOut className="size-4" />
                退出編輯
              </Button>
              <Button
                type="button"
                variant={article.status === "published" ? "outline" : "default"}
                size="sm"
                onClick={() => void publish()}
                disabled={isSaving || isPublishing || isDeleting}
              >
                {isPublishing ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
                {article.status === "published" ? "取消發布" : "發布"}
              </Button>
            </div>
          </div>
        </EditActionsPill>
      )}
    </div>
  );
}
