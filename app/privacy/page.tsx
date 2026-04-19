import { createPublicClient } from "@/lib/supabase/public";
import { formatDate } from "@/lib/date";
import { JsonLd } from "@/components/json-ld";
import { renderRichTextHtml, richTextDocumentClassName } from "@/lib/ui/rich-text";
import type { Metadata } from "next";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "隱私權政策｜人工智慧專責辦公室",
  description: "國立陽明交通大學人工智慧專責辦公室網站的隱私權政策與資料使用說明。",
  alternates: {
    canonical: "/privacy",
  },
  openGraph: {
    title: "隱私權政策｜人工智慧專責辦公室",
    description: "國立陽明交通大學人工智慧專責辦公室網站的隱私權政策與資料使用說明。",
    url: "/privacy",
  },
};

export default async function PrivacyPage() {
  const supabase = createPublicClient();

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

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "隱私權政策｜人工智慧專責辦公室",
    description: "國立陽明交通大學人工智慧專責辦公室網站的隱私權政策與資料使用說明。",
    url: "https://ai.winlab.tw/privacy",
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <JsonLd data={structuredData} />
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
