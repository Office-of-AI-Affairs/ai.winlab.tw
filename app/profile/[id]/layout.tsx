import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("public_profiles")
    .select("display_name")
    .eq("id", id)
    .single();

  const name = data?.display_name ?? "個人頁面";
  return {
    title: `${name}｜人工智慧專責辦公室`,
  };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
