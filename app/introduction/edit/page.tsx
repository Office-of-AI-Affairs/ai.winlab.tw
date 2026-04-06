import { IntroductionEditClient } from "./client";
import { requireAdminServer } from "@/lib/supabase/require-admin-server";
import type { Introduction } from "@/lib/supabase/types";
import { redirect } from "next/navigation";

export default async function IntroductionEditPage() {
  const { supabase } = await requireAdminServer();

  let { data, error } = await supabase.from("introduction").select("*").single();

  if (error?.code === "PGRST116") {
    const { data: newData, error: insertError } = await supabase
      .from("introduction")
      .insert({ title: "國立陽明交通大學 人工智慧專責辦公室", content: {} })
      .select()
      .single();

    if (insertError || !newData) {
      redirect("/introduction");
    }
    data = newData;
    error = null;
  }

  if (error || !data) {
    redirect("/introduction");
  }

  return <IntroductionEditClient initialIntroduction={data as Introduction} />;
}
