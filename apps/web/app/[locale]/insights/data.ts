import { unstable_cache } from "next/cache";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { articles, public_profiles } from "@/lib/db/schema";
import type { Article } from "@winlab/db";

export type ArticleListItem = Article & {
  author_name: string | null;
};

const withAuthor = { article: articles, author_name: public_profiles.display_name };

// Sort by published_at desc, falling back to created_at for legacy rows. Drafts
// are merged in client-side via useAuth (same pattern as announcement/data.ts).
export const getPublishedArticles = unstable_cache(
  async (): Promise<ArticleListItem[]> => {
    const rows = await db
      .select(withAuthor)
      .from(articles)
      .leftJoin(public_profiles, eq(public_profiles.id, articles.author_id))
      .where(eq(articles.status, "published"))
      .orderBy(sql`${articles.published_at} desc nulls last`, desc(articles.created_at));
    return rows.map((r) => ({ ...r.article, author_name: r.author_name ?? null }));
  },
  ["insights-published"],
  { tags: ["insights-published"], revalidate: 3600 },
);

export const getPublishedArticle = unstable_cache(
  async (id: string): Promise<ArticleListItem | null> => {
    const [row] = await db
      .select(withAuthor)
      .from(articles)
      .leftJoin(public_profiles, eq(public_profiles.id, articles.author_id))
      .where(and(eq(articles.id, id), eq(articles.status, "published")))
      .limit(1);
    return row ? { ...row.article, author_name: row.author_name ?? null } : null;
  },
  ["insight-by-id"],
  { tags: ["insights-published"], revalidate: 3600 },
);
