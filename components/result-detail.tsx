import type { Result } from "@/lib/supabase/types";
import { formatDate } from "@/lib/date";
import { renderRichTextHtml, richTextDocumentClassName } from "@/lib/ui/rich-text";
import { User, Users } from "lucide-react";
import Link from "next/link";

export type PublisherInfo = { name: string; href: string | null } | null;

export type CoauthorInfo = { id: string; name: string };

type Props = {
  result: Result;
  publisherInfo: PublisherInfo;
  coauthors?: CoauthorInfo[];
};

export function ResultDetail({ result, publisherInfo, coauthors = [] }: Props) {
  const contentHtml = renderRichTextHtml(result.content) ?? "<p>（無內容）</p>";

  return (
    <>
      <div className="max-w-6xl mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-4">{result.title}</h1>
        <div className="flex items-center gap-2 text-base text-muted-foreground">
          {result.type === "team"
            ? <Users className="w-4 h-4 shrink-0" />
            : <User className="w-4 h-4 shrink-0" />
          }
          {publisherInfo ? (
            <>
              {publisherInfo.href ? (
                <Link
                  href={publisherInfo.href}
                  className="hover:text-foreground transition-colors underline underline-offset-4"
                >
                  {publisherInfo.name}
                </Link>
              ) : (
                <span className="underline underline-offset-4 decoration-muted-foreground/40">
                  {publisherInfo.name}
                </span>
              )}
            </>
          ) : null}
          {coauthors.map((ca) => (
            <Link
              key={ca.id}
              href={`/profile/${ca.id}`}
              className="hover:text-foreground transition-colors underline underline-offset-4"
            >
              {ca.name}
            </Link>
          ))}
          <span className="opacity-30">·</span>
          <span>{formatDate(result.updated_at)}</span>
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
