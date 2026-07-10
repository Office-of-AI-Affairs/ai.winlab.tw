import { JsonLd } from "@/components/json-ld";
import { EventsPageClient } from "./client";
import { getPublishedEvents } from "./data";
import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "活動專區｜人工智慧專責辦公室",
  description: "瀏覽國立陽明交通大學人工智慧專責辦公室的活動專區、成果展示與相關內容。",
  alternates: {
    canonical: "/events",
  },
  // Next.js App Router performs object-level replace (not deep merge) when a
  // child segment exports openGraph. All required fields must be declared here
  // explicitly; relying on layout.tsx inheritance silently drops og:image.
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "zh_TW",
    title: "活動專區｜人工智慧專責辦公室",
    description: "瀏覽國立陽明交通大學人工智慧專責辦公室的活動專區、成果展示與相關內容。",
    url: "/events",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "活動專區｜人工智慧專責辦公室",
      },
    ],
  },
};

export default async function EventsPage() {
  const publishedEvents = await getPublishedEvents();

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "人工智慧專責辦公室活動列表",
    itemListElement: publishedEvents.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `https://ai.winlab.tw/events/${item.slug}`,
      name: item.name,
    })),
  };

  return (
    <>
      <JsonLd data={structuredData} />
      <EventsPageClient publishedEvents={publishedEvents} />
    </>
  );
}
