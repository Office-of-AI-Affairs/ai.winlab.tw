import { JsonLd } from "@/components/json-ld"
import { estimateReadingTime } from "@/lib/ui/reading-time"
import { renderArticle } from "@/lib/ui/rich-text"
import type { Metadata } from "next"
import { PrivacyClient } from "./client"
import { getCurrentPrivacyPolicy } from "./data"

export const revalidate = 3600

export const metadata: Metadata = {
  title: "隱私權政策｜人工智慧專責辦公室",
  description: "國立陽明交通大學人工智慧專責辦公室網站的隱私權政策與資料使用說明。",
  alternates: {
    canonical: "/privacy",
  },
  openGraph: {
    title: "隱私權政策｜人工智慧專責辦公室",
    description: "國立陽明交通大學人工智慧專責辦公室網站的隱私權政策與資料使用說明。",
    url: "/privacy",
  },
}

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "隱私權政策｜人工智慧專責辦公室",
  description: "國立陽明交通大學人工智慧專責辦公室網站的隱私權政策與資料使用說明。",
  url: "https://ai.winlab.tw/privacy",
}

export default async function PrivacyPage() {
  const current = await getCurrentPrivacyPolicy()
  const { html, toc } = renderArticle(current?.content ?? null)
  const { minutes: readingTimeMin } = estimateReadingTime(current?.content ?? null)

  return (
    <>
      <JsonLd data={structuredData} />
      <PrivacyClient
        initialContent={current?.content ?? null}
        initialContentHtml={html}
        initialToc={toc}
        currentVersion={current?.version ?? 0}
        currentUpdatedAt={current?.created_at ?? null}
        readingTimeMin={readingTimeMin}
      />
    </>
  )
}
