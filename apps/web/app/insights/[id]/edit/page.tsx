import { InsightEditClient } from "./client";
import { requireMemberOrAdminServer } from "@/lib/supabase/require-member-or-admin-server";
import type { Article } from "@winlab/db";
import { redirect } from "next/navigation";

export default async function InsightEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, user, role } = await requireMemberOrAdminServer();

  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    redirect("/insights");
  }

  const article = data as unknown as Article;
  // Member can only edit own articles. Admins pass through.
  if (role === "member" && article.author_id !== user.id) {
    redirect(`/insights/${id}`);
  }

  return <InsightEditClient initialArticle={article} />;
}
