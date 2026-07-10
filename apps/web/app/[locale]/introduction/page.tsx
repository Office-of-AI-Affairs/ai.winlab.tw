import { JsonLd } from "@/components/json-ld";
import { PageShell } from "@/components/page-shell";
import { renderArticle } from "@/lib/ui/rich-text";
import { estimateReadingTime } from "@/lib/ui/reading-time";
import type { Introduction, OrganizationMember, OrganizationMemberCategory } from "@winlab/db";
import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/site";
import { defaultLocale, isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { localeAlternates, ogAlternateLocales, ogLocale } from "@/lib/i18n/seo";
import { IntroductionArticleClient } from "./article-client";
import { OrganizationPageClient } from "./client";
import { getIntroduction, getOrganizationMembers } from "./data";

const CATEGORIES: OrganizationMemberCategory[] = ["core", "legal_entity", "industry"];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : defaultLocale;
  const dict = await getDictionary(locale);
  const title = dict.introduction.meta.title;
  const description = dict.introduction.meta.description;
  const alternates = localeAlternates("/introduction", locale);

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
  };
}

export default async function OrganizationPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : defaultLocale;
  const dict = await getDictionary(locale);

  const [introduction, members] = await Promise.all([
    getIntroduction(),
    getOrganizationMembers(),
  ]);

  const fallbackIntroduction = {
    id: "",
    title: dict.introduction.fallbackTitle,
    content: {} as Record<string, unknown>,
    created_at: "",
    updated_at: "",
  } as unknown as Introduction;

  const { html, toc } = renderArticle(introduction?.content);
  const { minutes: readingTimeMin } = estimateReadingTime(introduction?.content);

  const membersByCategory = Object.fromEntries(
    CATEGORIES.map((cat) => [cat, members.filter((m) => m.category === cat)])
  ) as Record<OrganizationMemberCategory, OrganizationMember[]>;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: dict.introduction.meta.title,
    description: dict.introduction.meta.description,
    url: "https://ai.winlab.tw/introduction",
  };

  return (
    <>
      <JsonLd data={structuredData} />
      <PageShell>
        <IntroductionArticleClient
          initialIntroduction={(introduction as Introduction | null) ?? fallbackIntroduction}
          initialContentHtml={html}
          initialToc={toc}
          readingTimeMin={readingTimeMin}
        />
      </PageShell>
      <OrganizationPageClient membersByCategory={membersByCategory} />
    </>
  );
}
