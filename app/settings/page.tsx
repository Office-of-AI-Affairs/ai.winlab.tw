import { SettingsMenu } from "@/components/settings-menu";
import { PageShell } from "@/components/page-shell";
import { getViewer } from "@/lib/supabase/get-viewer";
import { FileText, Image, Users } from "lucide-react";
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
    href: "/privacy?mode=edit",
    icon: FileText,
    label: "隱私權政策",
    description: "編輯隱私權政策內容，支援版本紀錄",
  },
];

export default async function SettingsPage() {
  const { user, isAdmin } = await getViewer();
  if (!user) redirect("/login");
  if (!isAdmin) redirect("/");

  return (
    <PageShell className="block">
      <h1 className="text-3xl font-bold mb-8">系統設定</h1>
      <SettingsMenu items={items} />
    </PageShell>
  );
}
