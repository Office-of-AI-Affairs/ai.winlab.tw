import { createClient } from "@/lib/supabase/server";
import { ChevronRight, FileText, Image, Users } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

const items = [
  {
    href: "/carousel",
    icon: Image,
    label: "首頁橫幅",
    description: "管理首頁輪播圖片、標題與連結",
  },
  {
    href: "/settings/users",
    icon: Users,
    label: "用戶管理",
    description: "查看所有已註冊用戶及其角色",
  },
  {
    href: "/privacy/edit",
    icon: FileText,
    label: "隱私權政策",
    description: "編輯隱私權政策內容，支援版本紀錄",
  },
];

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/");

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8">系統設定</h1>
      <div className="flex flex-col divide-y border rounded-2xl overflow-hidden">
        {items.map(({ href, icon: Icon, label, description }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-4 px-6 py-5 hover:bg-muted/50 transition-colors group"
          >
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
              <Icon className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold">{label}</p>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        ))}
      </div>
    </div>
  );
}
