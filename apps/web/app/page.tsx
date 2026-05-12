import { HomeActivity } from "@/components/home-activity";
import { HomeAnnouncement } from "@/components/home-announcement";
import { HomeCarousel } from "@/components/home-carousel";
import { HomeContacts } from "@/components/home-contacts";
import { HomeEvents } from "@/components/home-events";
import { HomeIntroduction } from "@/components/home-introduction";
import { Reveal } from "@/components/reveal";
import { JsonLd } from "@/components/json-ld";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "國立陽明交通大學 人工智慧專責辦公室",
  description:
    "國立陽明交通大學人工智慧專責辦公室網站，提供辦公室介紹、組織成員、公告、活動專區、成果展示與徵才資訊。",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "國立陽明交通大學 人工智慧專責辦公室",
    description:
      "國立陽明交通大學人工智慧專責辦公室網站，提供辦公室介紹、組織成員、公告、活動專區、成果展示與徵才資訊。",
    url: "/",
  },
};

export default async function Home() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "國立陽明交通大學 人工智慧專責辦公室",
    url: "https://ai.winlab.tw",
    description:
      "國立陽明交通大學人工智慧專責辦公室網站，提供辦公室介紹、組織成員、公告、活動專區、成果展示與徵才資訊。",
  };

  return (
    <main className="flex flex-col">
      <JsonLd data={structuredData} />
      <HomeCarousel />
      <Reveal><HomeIntroduction /></Reveal>
      <Reveal><HomeActivity /></Reveal>
      <Reveal><HomeAnnouncement /></Reveal>
      <Reveal><HomeEvents /></Reveal>
      <Reveal><HomeContacts /></Reveal>
    </main>
  );
}
