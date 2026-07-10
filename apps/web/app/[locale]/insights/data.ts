import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import type { Article } from "@winlab/db";

export type ArticleListItem = Article & {
  author_name: string | null;
};

// Sort by published_at desc, falling back to created_at for legacy rows. Drafts
// are merged in client-side via useAuth (same pattern as announcement/data.ts).
export const getPublishedArticles = unstable_cache(
  async (): Promise<ArticleListItem[]> => {
    const supabase = createPublicClient();
    const { data: articles } = await supabase
      .from("articles")
      .select("*")
      .eq("status", "published")
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });
    const rows = (articles as Article[] | null) ?? [];
    if (rows.length === 0) return [];

    const authorIds = Array.from(new Set(rows.map((r) => r.author_id)));
    const { data: profiles } = await supabase
      .from("public_profiles")
      .select("id, display_name")
      .in("id", authorIds);
    const nameMap = new Map<string, string>();
    for (const p of profiles ?? []) {
      if (p.display_name) nameMap.set(p.id, p.display_name);
    }
    return rows.map((r) => ({ ...r, author_name: nameMap.get(r.author_id) ?? null }));
  },
  ["insights-published"],
  { tags: ["insights-published"], revalidate: 3600 },
);

export const getPublishedArticle = unstable_cache(
  async (id: string): Promise<ArticleListItem | null> => {
    const supabase = createPublicClient();
    const { data } = await supabase
      .from("articles")
      .select("*")
      .eq("id", id)
      .eq("status", "published")
      .maybeSingle();
    if (!data) return null;
    const article = data as Article;
    const { data: profile } = await supabase
      .from("public_profiles")
      .select("display_name")
      .eq("id", article.author_id)
      .maybeSingle();
    return { ...article, author_name: profile?.display_name ?? null };
  },
  ["insight-by-id"],
  { tags: ["insights-published"], revalidate: 3600 },
);

export async function getPublishedArticleIds(): Promise<string[]> {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("articles")
    .select("id")
    .eq("status", "published");
  return (data ?? []).map((row: { id: string }) => row.id);
}
