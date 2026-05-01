/**
 * Shared layout for announcement content across read and edit surfaces.
 */

import { formatDate } from "@/lib/date";
import { Toc } from "@/components/toc";
import type { TocItem } from "@/lib/ui/article";
import { richTextDocumentClassName } from "@/lib/ui/rich-text";

type Props = {
  title: string;
  date: string;
  category: string;
  contentHtml: string;
  toc?: TocItem[];
};

export function AnnouncementDetail({ title, date, category, contentHtml, toc = [] }: Props) {
  return (
    <>
      <div className="max-w-6xl mb-8">
        <h1 className="text-4xl font-extrabold tracking-tight text-balance mb-4">
          {title}
        </h1>
        <div
          className="flex items-center gap-2 text-base text-muted-foreground flex-wrap"
        >
          <span>{formatDate(date)}</span>
          <span className="opacity-30" aria-hidden>
            ·
          </span>
          <span className="px-2 py-0.5 bg-muted rounded text-sm font-medium">
            {category}
          </span>
        </div>
      </div>

      <hr className="mb-8" />

      <div className="lg:flex lg:items-start lg:gap-8 max-w-6xl">
        <div className="flex-1 min-w-0">
        <div
          className={richTextDocumentClassName}
          dangerouslySetInnerHTML={{ __html: contentHtml }}
        />
        </div>
        <Toc items={toc} className="hidden lg:block" />
      </div>
    </>
  );
}
