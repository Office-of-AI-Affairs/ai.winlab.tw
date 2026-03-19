import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/date";
import { renderRichTextHtml, richTextDocumentClassName } from "@/lib/ui/rich-text";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "隱私權政策 — 國立陽明交通大學 人工智慧專責辦公室",
};

export default async function PrivacyPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("privacy_policy")
    .select("content, version, created_at")
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const contentHtml = renderRichTextHtml(data?.content);

  const updatedAt = data?.created_at
    ? formatDate(data.created_at, "long")
    : null;

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-2">隱私權政策</h1>
      {updatedAt && (
        <p className="text-sm text-muted-foreground mb-10">
          最後更新：{updatedAt}
          {data?.version ? `（第 ${data.version} 版）` : ""}
        </p>
      )}

      {contentHtml ? (
        <div
          className={richTextDocumentClassName}
          dangerouslySetInnerHTML={{ __html: contentHtml }}
        />
      ) : (
        <p className="text-muted-foreground">隱私權政策尚未設定。</p>
      )}
    </div>
  );
}
