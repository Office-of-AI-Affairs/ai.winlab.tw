import { IntroductionDetail } from "@/components/introduction-detail";
import { IntroductionEditButton } from "@/components/introduction-edit-button";
import { PageShell } from "@/components/page-shell";
import { getViewer } from "@/lib/supabase/get-viewer";
import { renderRichTextHtml } from "@/lib/ui/rich-text";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "關於我們｜人工智慧專責辦公室",
  description: "認識國立陽明交通大學人工智慧專責辦公室的定位、任務、課程方向與計畫介紹。",
  alternates: {
    canonical: "/introduction",
  },
  openGraph: {
    title: "關於我們｜人工智慧專責辦公室",
    description: "認識國立陽明交通大學人工智慧專責辦公室的定位、任務、課程方向與計畫介紹。",
    url: "/introduction",
  },
};

export default async function IntroductionPage() {
  const { supabase, isAdmin } = await getViewer();
  const { data: introduction } = await supabase.from("introduction").select("*").single();

  const contentHtml = renderRichTextHtml(introduction?.content) ?? "";

  return (
    <PageShell>
      <IntroductionDetail
        title={introduction?.title || "國立陽明交通大學 人工智慧專責辦公室"}
        contentHtml={contentHtml}
        actions={<IntroductionEditButton isAdmin={isAdmin} />}
      />
    </PageShell>
  );
}
