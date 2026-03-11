import { RecruitmentDetail } from "@/components/recruitment-detail";
import { createClient } from "@/lib/supabase/server";
import type { Recruitment } from "@/lib/supabase/types";
import { redirect } from "next/navigation";

export default async function RecruitmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: recruitment, error } = await supabase
    .from("competitions")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !recruitment) redirect("/recruitment");

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <RecruitmentDetail
        recruitment={recruitment as Recruitment}
        backHref="/recruitment"
        backLabel="返回列表"
      />
    </div>
  );
}
