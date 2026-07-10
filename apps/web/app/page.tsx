import { HomeActivity } from "@/components/home-activity";
import { HomeAnnouncement } from "@/components/home-announcement";
import { HomeCarousel } from "@/components/home-carousel";
import { HomeContacts } from "@/components/home-contacts";
import { HomeEvents } from "@/components/home-events";
import { HomeIntroduction } from "@/components/home-introduction";
import { Reveal } from "@/components/reveal";
import { JsonLd } from "@/components/json-ld";
import { SITE_NAME, SITE_NAME_EN, SITE_NAME_ZH } from "@/lib/site";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: SITE_NAME,
  description:
    "國立陽明交通大學人工智慧專責辦公室網站，提供辦公室介紹、組織成員、公告、活動專區、成果展示與徵才資訊。",
  alternates: {
    canonical: "/",
  },
  // Next.js App Router performs object-level replace (not deep merge) when a
  // child segment exports openGraph. All required fields must be declared here
  // explicitly; relying on layout.tsx inheritance silently drops og:image.
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "zh_TW",
    url: "https://ai.winlab.tw",
    title: SITE_NAME,
    description:
      "國立陽明交通大學人工智慧專責辦公室網站，提供辦公室介紹、組織成員、公告、活動專區、成果展示與徵才資訊。",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: SITE_NAME,
      },
    ],
  },
};

export default async function Home() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME_ZH,
    alternateName: SITE_NAME_EN,
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
