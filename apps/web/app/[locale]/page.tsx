import { HomeActivity } from "@/components/home-activity";
import { HomeAnnouncement } from "@/components/home-announcement";
import { HomeCarousel } from "@/components/home-carousel";
import { HomeContacts } from "@/components/home-contacts";
import { HomeEvents } from "@/components/home-events";
import { HomeIntroduction } from "@/components/home-introduction";
import { Reveal } from "@/components/reveal";
import { JsonLd } from "@/components/json-ld";
import { SITE_NAME, SITE_NAME_EN, SITE_NAME_ZH } from "@/lib/site";
import { defaultLocale, isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { localeAlternates, ogAlternateLocales, ogLocale } from "@/lib/i18n/seo";
import type { Metadata } from "next";

const DESCRIPTION_ZH =
  "國立陽明交通大學人工智慧專責辦公室網站，提供辦公室介紹、組織成員、公告、活動專區、成果展示與徵才資訊。";
const DESCRIPTION_EN =
  "The website of NYCU's Office of AI Affairs — office introduction, team members, announcements, events, results, and recruitment.";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : defaultLocale;
  const description = locale === "en" ? DESCRIPTION_EN : DESCRIPTION_ZH;
  const alternates = localeAlternates("/", locale);

  return {
    title: SITE_NAME,
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
      url: alternates.canonical,
      title: SITE_NAME,
      description,
      images: [{ url: "/og.png", width: 1200, height: 630, alt: SITE_NAME }],
    },
  };
}

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : defaultLocale;
  const dict = await getDictionary(locale);

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME_ZH,
    alternateName: SITE_NAME_EN,
    url: "https://ai.winlab.tw",
    description: locale === "en" ? DESCRIPTION_EN : DESCRIPTION_ZH,
  };

  return (
    <main className="flex flex-col">
      <JsonLd data={structuredData} />
      <HomeCarousel />
      <Reveal><HomeIntroduction t={dict.home} locale={locale} /></Reveal>
      <Reveal><HomeActivity t={dict.home} kindLabels={dict.activityKind} locale={locale} /></Reveal>
      <Reveal><HomeAnnouncement t={dict.home} locale={locale} /></Reveal>
      <Reveal><HomeEvents t={dict.home} locale={locale} /></Reveal>
      <Reveal><HomeContacts t={dict.home} /></Reveal>
    </main>
  );
}
