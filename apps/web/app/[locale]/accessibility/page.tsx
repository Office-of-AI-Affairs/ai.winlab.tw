import { JsonLd } from "@/components/seo/json-ld";
import { PageShell } from "@/components/shared/page-shell";
import { AppLink } from "@/components/shared/app-link";
import { defaultLocale, isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { localeAlternates, ogAlternateLocales, ogLocale } from "@/lib/i18n/seo";
import { formatDate } from "@/lib/date";
import {
  ACCESSIBILITY_CONTACT_EMAIL,
  ACCESSIBILITY_LAST_REVIEWED,
  SITE_NAME,
} from "@/lib/site";
import type { Metadata } from "next";

export const revalidate = 86400;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : defaultLocale;
  const dict = await getDictionary(locale);
  const title = dict.accessibility.meta.title;
  const description = dict.accessibility.meta.description;
  const alternates = localeAlternates("/accessibility", locale);

  return {
    title,
    description,
    alternates: {
      canonical: alternates.canonical,
      languages: alternates.languages,
    },
    // Object-level replace (not deep merge) per Next.js App Router — declare
    // every required field explicitly, don't rely on layout.tsx inheritance.
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

export default async function AccessibilityPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : defaultLocale;
  const dict = await getDictionary(locale);
  const t = dict.accessibility;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: t.meta.title,
    description: t.meta.description,
    url: "https://ai.winlab.tw/accessibility",
  };

  return (
    <>
      <JsonLd data={structuredData} />
      <PageShell tone="content">
        <h1 className="text-3xl font-bold">{t.heading}</h1>
        <p className="text-base leading-7">{t.intro}</p>

        <section className="flex flex-col gap-2">
          <h2 className="text-2xl font-semibold">{t.conformanceHeading}</h2>
          <p className="text-base leading-7">{t.conformanceBody}</p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-2xl font-semibold">{t.limitationsHeading}</h2>
          <p className="text-base leading-7">{t.limitationsIntro}</p>
          <ul className="list-disc space-y-1 pl-6 text-base leading-7">
            <li>{t.limitationZhOnlyArticles}</li>
            <li>{t.limitationThirdPartyEmbeds}</li>
            <li>{t.limitationLegacyContent}</li>
          </ul>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-2xl font-semibold">{t.contactHeading}</h2>
          <p className="text-base leading-7">{t.contactBody}</p>
          <AppLink
            href={`mailto:${ACCESSIBILITY_CONTACT_EMAIL}`}
            className="font-mono text-primary underline-offset-4 hover:underline break-all"
          >
            {ACCESSIBILITY_CONTACT_EMAIL}
          </AppLink>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-2xl font-semibold">{t.lastReviewedHeading}</h2>
          <p className="text-sm text-muted-foreground">
            {t.lastReviewedLabel} {formatDate(ACCESSIBILITY_LAST_REVIEWED, "long", locale)}
          </p>
        </section>
      </PageShell>
    </>
  );
}
