import { createClient } from "@/lib/supabase/server";
import { generateText } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export async function HomeIntroduction() {
  const supabase = await createClient();
  const { data: introduction } = await supabase
    .from("introduction")
    .select("*")
    .single();

  const contentText =
    introduction?.content && Object.keys(introduction.content).length > 0
      ? generateText(introduction.content, [StarterKit])
      : "";

  const truncatedText =
    contentText.length > 150 ? `${contentText.slice(0, 150)}…` : contentText;

  return (
    <div className="bg-muted/40 py-20 px-4">
      <div className="max-w-3xl mx-auto flex flex-col items-center gap-6 text-center">
        <h2 className="text-3xl font-bold">
          {introduction?.title || "國立陽明交通大學人工智慧專責辦公室"}
        </h2>
        {truncatedText && (
          <p className="text-lg text-muted-foreground leading-relaxed">
            {truncatedText}
          </p>
        )}
        <Button asChild variant="secondary" size="lg" className="px-12 text-lg mt-2">
          <Link href="/introduction">
            探索更多
          </Link>
        </Button>
      </div>
    </div>
  );
}
