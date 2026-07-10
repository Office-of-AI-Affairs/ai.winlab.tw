import { JsonLd } from "@/components/json-ld"
import { estimateReadingTime } from "@/lib/ui/reading-time"
import { renderArticle } from "@/lib/ui/rich-text"
import type { Metadata } from "next"
import { SITE_NAME } from "@/lib/site"
import { defaultLocale, isLocale, type Locale } from "@/lib/i18n/config"
import { getDictionary } from "@/lib/i18n/get-dictionary"
import { localeAlternates, ogAlternateLocales, ogLocale } from "@/lib/i18n/seo"
import { PrivacyClient } from "./client"
import { getCurrentPrivacyPolicy } from "./data"

export const revalidate = 3600

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale: raw } = await params
  const locale: Locale = isLocale(raw) ? raw : defaultLocale
  const dict = await getDictionary(locale)
  const title = dict.privacy.meta.title
  const description = dict.privacy.meta.description
  const alternates = localeAlternates("/privacy", locale)

  return {
    title,
    description,
    alternates: {
      canonical: alternates.canonical,
      languages: alternates.languages,
    },
    // Next.js App Router performs object-level replace (not deep merge) when a
    // child segment exports openGraph. All required fields must be declared here
    // explicitly; relying on layout.tsx inheritance silently drops og:image.
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: ogLocale(locale),
      alternateLocale: ogAlternateLocales(locale),
      title,
      description,
      url: alternates.canonical,
      images: [
        {
          url: "/og.png",
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
  }
}

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale: raw } = await params
  const locale: Locale = isLocale(raw) ? raw : defaultLocale
  const dict = await getDictionary(locale)
  const current = await getCurrentPrivacyPolicy()
  const { html, toc } = renderArticle(current?.content ?? null)
  const { minutes: readingTimeMin } = estimateReadingTime(current?.content ?? null)

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: dict.privacy.meta.title,
    description: dict.privacy.meta.description,
    url: "https://ai.winlab.tw/privacy",
  }

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
