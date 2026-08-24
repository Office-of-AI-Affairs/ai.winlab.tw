"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSiteSearch } from "@/hooks/use-site-search";
import { useLocale, useT } from "@/lib/i18n/locale-provider";
import { localizedPath } from "@/lib/i18n/routing";
import { groupSearchResults } from "@/lib/search/group-results";
import { isSearchQueryValid, normalizeSearchQuery } from "@/lib/search/query";
import { searchResultPath } from "@/lib/search/result-path";
import type { SearchResultType } from "@/lib/search/types";

const GROUP_LABEL_KEY: Record<SearchResultType, "groupAnnouncement" | "groupEvent" | "groupResult"> = {
  announcement: "groupAnnouncement",
  event: "groupEvent",
  result: "groupResult",
};

/**
 * cmd/ctrl-K command palette. Mounted once by `SearchProvider`; visibility is
 * controlled by the shared `open` state so the header's search button and
 * the global keyboard shortcut both toggle the same dialog.
 */
export function SiteSearchCommand({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const [rawQuery, setRawQuery] = useState("");
  const { results, isLoading, error } = useSiteSearch(rawQuery, locale);

  const query = normalizeSearchQuery(rawQuery);
  const queryIsValid = isSearchQueryValid(rawQuery);
  const groups = groupSearchResults(results);

  function select(path: string) {
    onOpenChange(false);
    setRawQuery("");
    router.push(localizedPath(path, locale));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader className="sr-only">
        <DialogTitle>{t.search.dialogTitle}</DialogTitle>
        <DialogDescription>{t.search.dialogDescription}</DialogDescription>
      </DialogHeader>
      <DialogContent className="overflow-hidden p-0">
        {/* shouldFilter=false: results are already ranked server-side by
            search_site() — cmdk's own fuzzy filter would re-hide/reorder
            items using a matcher that doesn't understand CJK substrings. */}
        <Command
          shouldFilter={false}
          className="**:data-[slot=command-input-wrapper]:h-12 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]]:px-2 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3"
        >
          <CommandInput
            placeholder={t.search.placeholder}
            value={rawQuery}
            onValueChange={setRawQuery}
          />
          <CommandList>
            {!queryIsValid && <CommandEmpty>{t.search.minCharsHint}</CommandEmpty>}
            {queryIsValid && isLoading && (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" aria-hidden />
                {t.search.loading}
              </div>
            )}
            {queryIsValid && !isLoading && error && (
              <CommandEmpty>{t.search.errorLabel}</CommandEmpty>
            )}
            {queryIsValid && !isLoading && !error && results.length === 0 && (
              <CommandEmpty>{t.search.empty.replace("{query}", query)}</CommandEmpty>
            )}
            {queryIsValid && !isLoading && !error && results.length > 0 && (
              <>
                {groups.map((group) => (
                  <CommandGroup key={group.type} heading={t.search[GROUP_LABEL_KEY[group.type]]}>
                    {group.items.map((item) => (
                      <CommandItem
                        key={`${item.type}-${item.id}`}
                        value={`${item.type}-${item.id}`}
                        onSelect={() => select(searchResultPath(item))}
                      >
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate font-medium">{item.title}</span>
                          {item.snippet && (
                            <span className="truncate text-xs text-muted-foreground">
                              {item.snippet}
                            </span>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ))}
              </>
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
