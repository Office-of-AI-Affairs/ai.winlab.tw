/**
 * Shared layout for introduction content across read and edit surfaces.
 */

import type { ReactNode } from "react";
import { richTextDocumentClassName } from "@/lib/ui/rich-text";

type Props = {
  title: string;
  contentHtml: string;
  /** Optional slot rendered next to the title (e.g. Edit button on read-only page) */
  actions?: ReactNode;
};

export function IntroductionDetail({ title, contentHtml, actions }: Props) {
  return (
    <>
      <div className="max-w-6xl mb-8 flex items-center justify-between gap-4">
        <h1 className="text-4xl font-extrabold tracking-tight text-balance">
          {title}
        </h1>
        {actions}
      </div>

      <div className="max-w-6xl">
        {contentHtml ? (
          <div
            className={richTextDocumentClassName}
            dangerouslySetInnerHTML={{ __html: contentHtml }}
          />
        ) : (
          <p className="text-muted-foreground">（無內容）</p>
        )}
      </div>
    </>
  );
}
