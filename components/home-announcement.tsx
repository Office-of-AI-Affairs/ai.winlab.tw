import { HomeAnnouncementTable } from "@/components/home-announcement-table";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export async function HomeAnnouncement() {
  const supabase = await createClient();
  const { data: announcements } = await supabase
    .from("announcements")
    .select("*")
    .eq("status", "published")
    .is("event_id", null)
    .order("date", { ascending: false })
    .limit(5);

  return (
    <div className="container max-w-6xl mx-auto py-16 px-4 flex flex-col gap-8">
      <h2 className="text-2xl font-bold border-l-4 border-primary pl-3">最新公告</h2>
      {!announcements || announcements.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">目前沒有公告</div>
      ) : (
        <HomeAnnouncementTable announcements={announcements} />
      )}
      <div className="flex justify-center">
        <Button asChild variant="secondary" className="px-12 text-lg">
          <Link href="/announcement">
            探索更多
          </Link>
        </Button>
      </div>
    </div>
  );
}
