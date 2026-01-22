import { createClient } from "@/lib/supabase/server";
import { generateHTML } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";
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

  if (error || !announcement) {
    notFound();
  }

  const contentHtml =
    announcement.content && Object.keys(announcement.content).length > 0
      ? generateHTML(announcement.content, [StarterKit])
      : "<p>（無內容）</p>";

  return (
    <div className="container max-w-5xl mx-auto p-4 flex flex-col gap-6 mt-8">
      <Link
        href="/announcement"
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors w-fit"
      >
        <ArrowLeft className="w-4 h-4" />
        返回列表
      </Link>

      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>{announcement.date}</span>
          <span className="px-2 py-1 bg-muted rounded">{announcement.category}</span>
        </div>
        <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance mt-2 mb-4">{announcement.title}</h1>
        <div
          className="prose prose-sm sm:prose-base max-w-none"
          dangerouslySetInnerHTML={{ __html: contentHtml }}
        />
      </div>
    </div>
  );
}