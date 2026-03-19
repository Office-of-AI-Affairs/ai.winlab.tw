/**
 * Shared layout for announcement content across read and edit surfaces.
 */

import { richTextDocumentClassName } from "@/lib/ui/rich-text";

type Props = {
  title: string;
  date: string;
  category: string;
  contentHtml: string;
};

export function AnnouncementDetail({ title, date, category, contentHtml }: Props) {
  return (
    <>
      <div className="max-w-6xl mb-8">
        <h1 className="text-4xl font-extrabold tracking-tight text-balance mb-4">
          {title}
        </h1>
        <div
          className="flex items-center gap-2 text-base text-muted-foreground flex-wrap"
        >
          <span>{date}</span>
          <span className="opacity-30" aria-hidden>
            ·
          </span>
          <span className="px-2 py-0.5 bg-muted rounded text-sm font-medium">
            {category}
          </span>
        </div>
      </div>

      <hr className="mb-8" />

      <div className="max-w-6xl">
        <div
          className={richTextDocumentClassName}
          dangerouslySetInnerHTML={{ __html: contentHtml }}
        />
      </div>
    </>
  );
}
