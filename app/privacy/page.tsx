import { createClient } from "@/lib/supabase/server";
import TiptapImage from "@tiptap/extension-image";
import { generateHTML } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const contentHtml = data?.content && Object.keys(data.content).length > 0
    ? generateHTML(data.content as any, [
        StarterKit,
        TiptapImage.configure({ HTMLAttributes: { class: "rounded-lg max-w-full h-auto" } }),
      ])
    : null;

  const updatedAt = data?.created_at
    ? new Date(data.created_at).toLocaleDateString("zh-TW", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
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
          className="prose prose-neutral dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: contentHtml }}
        />
      ) : (
        <p className="text-muted-foreground">隱私權政策尚未設定。</p>
      )}
    </div>
  );
}
