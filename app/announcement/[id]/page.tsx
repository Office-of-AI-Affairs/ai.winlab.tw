import { AnnouncementDetail } from "@/components/announcement-detail";
import { createClient } from "@/lib/supabase/server";
import { renderRichTextHtml } from "@/lib/ui/rich-text";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("announcements").select("title").eq("id", id).single();
  const title = data?.title ?? "公告";
  return { title: `${title}｜人工智慧專責辦公室` };
}

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

  const contentHtml = renderRichTextHtml(announcement.content) ?? "<p>（無內容）</p>";

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
