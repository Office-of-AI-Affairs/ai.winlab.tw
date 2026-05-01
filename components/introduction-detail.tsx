/**
 * Shared layout for introduction content across read and edit surfaces.
 */

import type { ReactNode } from "react";
import { Toc } from "@/components/toc";
import type { TocItem } from "@/lib/ui/article";
import { richTextDocumentClassName } from "@/lib/ui/rich-text";

type Props = {
  title: string;
  contentHtml: string;
  /** Optional slot rendered next to the title (e.g. Edit button on read-only page) */
  actions?: ReactNode;
  toc?: TocItem[];
  readingTimeMin?: number;
};

export function IntroductionDetail({ title, contentHtml, actions, toc = [], readingTimeMin }: Props) {
  return (
    <>
      <div className="max-w-6xl mb-8 flex items-center justify-between gap-4">
        <div className="flex flex-col gap-2 min-w-0">
          <h1 className="text-4xl font-extrabold tracking-tight text-balance">
            {title}
          </h1>
          {readingTimeMin ? (
            <p className="text-sm text-muted-foreground">閱讀 {readingTimeMin} 分鐘</p>
          ) : null}
        </div>
        {actions}
      </div>

      <div className="lg:flex lg:items-start lg:gap-8 max-w-6xl">
        <div className="flex-1 min-w-0">
        {contentHtml ? (
          <div
            className={richTextDocumentClassName}
            dangerouslySetInnerHTML={{ __html: contentHtml }}
          />
        ) : (
          <p className="text-muted-foreground">（無內容）</p>
        )}
        </div>
        <Toc items={toc} className="hidden lg:block" />
      </div>
    </>
  );
}
