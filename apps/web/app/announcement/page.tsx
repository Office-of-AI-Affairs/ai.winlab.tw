import { JsonLd } from "@/components/json-ld";
import { AnnouncementPageClient } from "./client";
import { getPublishedAnnouncements } from "./data";
import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "公告｜人工智慧專責辦公室",
  description: "查看國立陽明交通大學人工智慧專責辦公室的最新公告、招生資訊與系統公告。",
  alternates: {
    canonical: "/announcement",
  },
  // Next.js App Router performs object-level replace (not deep merge) when a
  // child segment exports openGraph. All required fields must be declared here
  // explicitly; relying on layout.tsx inheritance silently drops og:image.
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "zh_TW",
    title: "公告｜人工智慧專責辦公室",
    description: "查看國立陽明交通大學人工智慧專責辦公室的最新公告、招生資訊與系統公告。",
    url: "/announcement",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "公告｜人工智慧專責辦公室",
      },
    ],
  },
};

export default async function AnnouncementPage() {
  const publishedAnnouncements = await getPublishedAnnouncements();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "人工智慧專責辦公室公告列表",
    itemListElement: publishedAnnouncements.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `https://ai.winlab.tw/announcement/${item.id}`,
      name: item.title,
    })),
  };

  return (
    <>
      <JsonLd data={structuredData} />
      <AnnouncementPageClient publishedAnnouncements={publishedAnnouncements} />
    </>
  );
}
