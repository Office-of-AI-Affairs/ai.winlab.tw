import { JsonLd } from "@/components/seo/json-ld";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { public_profiles } from "@/lib/db/schema";
import { isUuid } from "@/lib/slug";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { defaultLocale, isLocale } from "@/lib/i18n/config";
import { localeAlternates } from "@/lib/i18n/seo";
import type { Metadata } from "next";
import { cache } from "react";

// Shared by generateMetadata and the layout within one request.
const getProfileMeta = cache(async (id: string) => {
  if (!isUuid(id)) return null;
  const [row] = await db
    .select({ display_name: public_profiles.display_name, avatar_url: public_profiles.avatar_url })
    .from(public_profiles)
    .where(eq(public_profiles.id, id))
    .limit(1);
  return row ?? null;
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale, id } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : defaultLocale;
  const dict = await getDictionary(locale);
  const publicProfile = await getProfileMeta(id);

  const name = publicProfile?.display_name ?? dict.profile.metaNameFallbackGeneric;
  const description = dict.profile.layoutMetaDescription.replace("{name}", name);
  const ogImages = publicProfile?.avatar_url
    ? [{ url: publicProfile.avatar_url, width: 400, height: 400, alt: name }]
    : [];
  const a = localeAlternates(`/profile/${id}`, locale);
  return {
    title: `${name}${dict.common.titleSuffix}`,
    description,
    alternates: {
      canonical: a.canonical,
      languages: a.languages,
    },
    openGraph: {
      title: `${name}${dict.common.titleSuffix}`,
      description,
      url: `/profile/${id}`,
      images: ogImages,
    },
  };
}

export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: rawLocale, id } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : defaultLocale;
  const dict = await getDictionary(locale);
  const data = await getProfileMeta(id);
  const name = data?.display_name ?? dict.profile.metaNameFallbackGeneric;
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Person",
    name,
    url: `https://ai.winlab.tw/profile/${id}`,
    mainEntityOfPage: `https://ai.winlab.tw/profile/${id}`,
    worksFor: {
      "@type": "Organization",
      name: dict.profile.orgName,
      url: "https://ai.winlab.tw",
    },
  };

  return (
    <>
      <JsonLd data={structuredData} />
      {children}
    </>
  );
}
