import { IntroductionDetail } from "@/components/introduction-detail";
import { IntroductionEditButton } from "@/components/introduction-edit-button";
import { createClient } from "@/lib/supabase/server";
import Image from "@tiptap/extension-image";
import { generateHTML } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";
import Youtube from "@tiptap/extension-youtube";

export default async function IntroductionPage() {
  const supabase = await createClient();
  const { data: introduction } = await supabase.from("introduction").select("*").single();

  const contentHtml =
    introduction?.content && Object.keys(introduction.content).length > 0
      ? generateHTML(introduction.content, [
          StarterKit,
          Image.configure({ HTMLAttributes: { class: "rounded-lg max-w-full h-auto" } }),
          Youtube,
        ])
      : "";

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 flex flex-col gap-8">
      <IntroductionDetail
        title={introduction?.title || "國立陽明交通大學 人工智慧專責辦公室"}
        contentHtml={contentHtml}
        actions={<IntroductionEditButton />}
      />
    </div>
  );
}
