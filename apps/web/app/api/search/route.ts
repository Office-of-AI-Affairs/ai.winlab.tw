import { isLocale, defaultLocale } from "@/lib/i18n/config";
import { searchSite } from "@/lib/search/run";
import { isSearchQueryValid, normalizeSearchQuery } from "@/lib/search/query";

// Backs the cmd/ctrl-K palette (hooks/use-site-search.ts). Public content
// only, so the response may be cached briefly.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = normalizeSearchQuery(url.searchParams.get("q") ?? "");
  const rawLocale = url.searchParams.get("locale") ?? "";
  const locale = isLocale(rawLocale) ? rawLocale : defaultLocale;
  const rows = isSearchQueryValid(query) ? await searchSite(query, locale) : [];
  return Response.json(rows, { headers: { "Cache-Control": "public, max-age=60" } });
}
