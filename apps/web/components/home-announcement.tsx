import { getLatestAnnouncements } from "@/app/[locale]/announcement/data";
import { HomeAnnouncementTable } from "@/components/home-announcement-table";
import { Button } from "@/components/ui/button";
import { type Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionary";
import { localizedPath } from "@/lib/i18n/routing";
import Link from "next/link";

export async function HomeAnnouncement({
  t,
  locale,
}: {
  t: Dictionary["home"];
  locale: Locale;
}) {
  const announcements = await getLatestAnnouncements();

  return (
    <div className="container max-w-6xl mx-auto py-16 px-4 flex flex-col gap-8">
      <h2 className="text-2xl font-bold border-l-4 border-primary pl-3">{t.announcementHeading}</h2>
      {announcements.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">{t.announcementEmpty}</div>
      ) : (
        <HomeAnnouncementTable announcements={announcements} />
      )}
      <div className="flex justify-center">
        <Button asChild variant="secondary" className="px-12 text-lg">
          <Link href={localizedPath("/announcement", locale)}>
            {t.explore}
          </Link>
        </Button>
      </div>
    </div>
  );
}
