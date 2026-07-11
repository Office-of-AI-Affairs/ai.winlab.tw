import { SettingsMenu } from "@/components/settings-menu";
import { PageShell } from "@/components/page-shell";
import { getViewer } from "@/lib/supabase/get-viewer";
import { defaultLocale, isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { FileText, Image, Users } from "lucide-react";
import { redirect } from "next/navigation";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : defaultLocale;
  const dict = await getDictionary(locale);
  const settings = dict.admin.settings;

  const { user, isAdmin } = await getViewer();
  if (!user) redirect("/login");
  if (!isAdmin) redirect("/");

  const items = [
    {
      href: "/carousel",
      icon: Image,
      label: settings.carousel.label,
      description: settings.carousel.description,
    },
    {
      href: "/settings/users",
      icon: Users,
      label: settings.users.label,
      description: settings.users.description,
    },
    {
      href: "/privacy?mode=edit",
      icon: FileText,
      label: settings.privacy.label,
      description: settings.privacy.description,
    },
  ];

  return (
    <PageShell className="block">
      <h1 className="text-3xl font-bold mb-8">{settings.title}</h1>
      <SettingsMenu items={items} />
    </PageShell>
  );
}
