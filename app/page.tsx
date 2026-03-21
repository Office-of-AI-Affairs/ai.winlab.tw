import { HomeAnnouncement } from "@/components/home-announcement";
import { HomeCarousel } from "@/components/home-carousel";
import { HomeContacts } from "@/components/home-contacts";
import { HomeEvents } from "@/components/home-events";
import { HomeIntroduction } from "@/components/home-introduction";
import { getViewer } from "@/lib/supabase/get-viewer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "國立陽明交通大學 人工智慧專責辦公室",
  description:
    "國立陽明交通大學人工智慧專責辦公室網站，提供辦公室介紹、組織成員、公告、活動專區、成果展示與徵才資訊。",
};

export default async function Home() {
  const { isAdmin } = await getViewer();

  return (
    <main className="flex flex-col">
      <HomeCarousel isAdmin={isAdmin} />
      <HomeIntroduction />
      {/* <HomeOrganization /> */}
      <HomeAnnouncement />
      <HomeEvents />
      <HomeContacts isAdmin={isAdmin} />
    </main>
  );
}
