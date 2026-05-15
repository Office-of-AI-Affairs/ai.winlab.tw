import { JsonLd } from "@/components/json-ld";
import { InsightsPageClient } from "./client";
import { getPublishedArticles } from "./data";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "觀點｜人工智慧專責辦公室",
  description: "辦公室成員的觀察、筆記與分享 — 一週至少一篇。",
  alternates: { canonical: "/insights" },
  openGraph: {
    title: "觀點｜人工智慧專責辦公室",
    description: "辦公室成員的觀察、筆記與分享 — 一週至少一篇。",
    url: "/insights",
  },
};

export default async function InsightsPage() {
  const published = await getPublishedArticles();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "觀點文章列表",
    itemListElement: published.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `https://ai.winlab.tw/insights/${item.id}`,
      name: item.title,
    })),
  };

  return (
    <>
      <JsonLd data={structuredData} />
      <InsightsPageClient publishedArticles={published} />
    </>
  );
}
