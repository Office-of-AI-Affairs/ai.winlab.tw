import TiptapImage from "@tiptap/extension-image";
import { generateHTML } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";
import Youtube from "@tiptap/extension-youtube";
import { User, Users } from "lucide-react";
import Link from "next/link";
import type { Result } from "@/lib/supabase/types";

export type PublisherInfo = { name: string; href: string | null } | null;

type Props = {
  result: Result;
  publisherInfo: PublisherInfo;
};

const instrumentSerifStyle = { fontFamily: "var(--font-instrument-serif)" };

export function ResultDetail({ result, publisherInfo }: Props) {
  const contentHtml =
    result.content && Object.keys(result.content).length > 0
      ? generateHTML(result.content, [
          StarterKit,
          TiptapImage.configure({ HTMLAttributes: { class: "rounded-lg max-w-full h-auto" } }),
          Youtube,
        ])
      : "<p>（無內容）</p>";

  return (
    <>
      <div className="max-w-6xl mb-8">
        <h1 className="text-4xl font-extrabold tracking-tight text-balance mb-4">
          {result.title}
        </h1>
        <div className="flex items-center gap-2 text-base text-muted-foreground" style={instrumentSerifStyle}>
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
              <span className="opacity-30">·</span>
            </>
          ) : null}
          <span>{result.date}</span>
        </div>
      </div>

      <hr className="mb-8" />

      <div className="max-w-6xl">
        <div
          className="prose prose-sm sm:prose-base max-w-none"
          dangerouslySetInnerHTML={{ __html: contentHtml }}
        />
      </div>
    </>
  );
}
