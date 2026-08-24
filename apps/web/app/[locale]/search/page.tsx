import type { Metadata } from "next";

import { AppLink } from "@/components/shared/app-link";
import { PageShell } from "@/components/shared/page-shell";
import { defaultLocale, isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { localeAlternates } from "@/lib/i18n/seo";
import { groupSearchResults } from "@/lib/search/group-results";
import { isSearchQueryValid, normalizeSearchQuery } from "@/lib/search/query";
import { searchResultPath } from "@/lib/search/result-path";
import type { SearchResultRow, SearchResultType } from "@/lib/search/types";
import { createPublicClient } from "@/lib/supabase/public";

const GROUP_LABEL_KEY: Record<SearchResultType, "groupAnnouncement" | "groupEvent" | "groupResult"> = {
  announcement: "groupAnnouncement",
  event: "groupEvent",
  result: "groupResult",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : defaultLocale;
  const dict = await getDictionary(locale);
  const alternates = localeAlternates("/search", locale);

  return {
    title: dict.search.pageTitle,
    description: dict.search.pageDescription,
    alternates: {
      canonical: alternates.canonical,
      languages: alternates.languages,
    },
    // Search-result pages are thin/duplicate by nature (same content,
    // infinite `?q=` variants) — keep them out of the index, but crawlable
    // so this still works as the no-JS fallback the cmd/ctrl-K palette
    // degrades to.
    robots: { index: false, follow: true },
  };
}

/**
 * No-JS / crawler fallback for global search (#45). The cmd/ctrl-K palette
 * (`components/search/site-search-command.tsx`) is the primary interactive
 * surface; this route runs the exact same `search_site()` RPC server-side
 * (cookieless `createPublicClient`, so RLS still gates rows to published
 * content) and renders results directly into the HTML — a plain GET `<form>`
 * works with JavaScript disabled.
 */
export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : defaultLocale;
  const dict = await getDictionary(locale);

  const { q } = await searchParams;
  const rawQuery = Array.isArray(q) ? q[0] ?? "" : q ?? "";
  const query = normalizeSearchQuery(rawQuery);
  const queryIsValid = isSearchQueryValid(rawQuery);

  let rows: SearchResultRow[] = [];
  if (queryIsValid) {
    const supabase = createPublicClient();
    const { data } = await supabase.rpc("search_site", { query, locale });
    rows = (data ?? []) as SearchResultRow[];
  }
  const groups = groupSearchResults(rows);

  return (
    <PageShell tone="content">
      <h1 className="text-3xl font-bold">{dict.search.pageTitle}</h1>

      <form action="" method="get" role="search" className="flex gap-2">
        <label htmlFor="search-q" className="sr-only">
          {dict.search.inputLabel}
        </label>
        <input
          id="search-q"
          type="search"
          name="q"
          defaultValue={rawQuery}
          placeholder={dict.search.placeholder}
          aria-label={dict.search.inputLabel}
          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <button
          type="submit"
          className="interactive-scale rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          {dict.search.submit}
        </button>
      </form>

      {!queryIsValid && <p className="text-muted-foreground">{dict.search.noQuery}</p>}

      {queryIsValid && rows.length === 0 && (
        <p className="text-muted-foreground">{dict.search.empty.replace("{query}", query)}</p>
      )}

      {queryIsValid && rows.length > 0 && (
        <div className="flex flex-col gap-8">
          <p className="text-sm text-muted-foreground">
            {dict.search.resultsCount.replace("{count}", String(rows.length))}
          </p>
          {groups.map((group) => (
            <section key={group.type} className="flex flex-col gap-3">
              <h2 className="text-lg font-semibold">{dict.search[GROUP_LABEL_KEY[group.type]]}</h2>
              <ul className="flex flex-col gap-3">
                {group.items.map((item) => (
                  <li key={`${item.type}-${item.id}`}>
                    <AppLink
                      href={searchResultPath(item)}
                      className="block rounded-lg border border-border p-4 hover:bg-muted/50"
                    >
                      <span className="font-medium">{item.title}</span>
                      {item.snippet && (
                        <span className="mt-1 block text-sm text-muted-foreground">
                          {item.snippet}
                        </span>
                      )}
                    </AppLink>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </PageShell>
  );
}
