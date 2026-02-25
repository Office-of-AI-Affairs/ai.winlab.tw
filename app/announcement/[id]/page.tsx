import { AnnouncementDetail } from "@/components/announcement-detail";
import { createClient } from "@/lib/supabase/server";
import Image from "@tiptap/extension-image";
import { generateHTML } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";
import Youtube from "@tiptap/extension-youtube";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function AnnouncementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: announcement, error } = await supabase
    .from("announcements")
    .select("*")
    .eq("id", id)
    .eq("status", "published")
    .single();

  if (error || !announcement) notFound();

  const contentHtml =
    announcement.content && Object.keys(announcement.content).length > 0
      ? generateHTML(announcement.content, [
          StarterKit,
          Image.configure({ HTMLAttributes: { class: "rounded-lg max-w-full h-auto" } }),
          Youtube,
        ])
      : "<p>（無內容）</p>";

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <Link
        href="/announcement"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-10"
      >
        <ArrowLeft className="w-4 h-4" />
        返回列表
      </Link>

      <AnnouncementDetail
        title={announcement.title}
        date={announcement.date}
        category={announcement.category}
        contentHtml={contentHtml}
      />
    </div>
  );
}
