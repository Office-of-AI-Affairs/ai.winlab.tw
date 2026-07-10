import { getIntroduction } from "@/app/[locale]/introduction/data";
import { generateText } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { Button } from "@/components/ui/button";
import { type Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionary";
import { localizedPath } from "@/lib/i18n/routing";
import Link from "next/link";

export async function HomeIntroduction({
  t,
  locale,
}: {
  t: Dictionary["home"];
  locale: Locale;
}) {
  const introduction = await getIntroduction();

  const contentText =
    introduction?.content && Object.keys(introduction.content).length > 0
      ? generateText(introduction.content, [StarterKit])
      : "";

  const truncatedText =
    contentText.length > 150 ? `${contentText.slice(0, 150)}…` : contentText;

  return (
    <div className="bg-muted/40 py-20 px-4">
      <div className="max-w-3xl mx-auto flex flex-col items-center gap-6 text-center">
        <h1 className="text-3xl font-bold">
          {introduction?.title || t.introFallbackTitle}
        </h1>
        {truncatedText && (
          <p className="text-lg text-muted-foreground leading-relaxed">
            {truncatedText}
          </p>
        )}
        <Button asChild variant="secondary" className="px-12 text-lg mt-2">
          <Link href={localizedPath("/introduction", locale)}>
            {t.explore}
          </Link>
        </Button>
      </div>
    </div>
  );
}
