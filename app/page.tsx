import { HomeAnnouncement } from "@/components/home-announcement";
import { HomeCarousel } from "@/components/home-carousel";
import { HomeCompetition } from "@/components/home-competition";
import { HomeContacts } from "@/components/home-contacts";
import { HomeIntroduction } from "@/components/home-introduction";
import { HomeResult } from "@/components/home-result";

export default function Home() {
  return (
    <main className="flex flex-col gap-6">
      <HomeCarousel />
      <HomeIntroduction />
      <HomeAnnouncement />
      <HomeResult />
      <HomeCompetition />
      <HomeContacts />
    </main>
  );
}
