import { JsonLd } from "@/components/json-ld";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { defaultLocale, isLocale } from "@/lib/i18n/config";
import { localeAlternates } from "@/lib/i18n/seo";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale, id } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : defaultLocale;
  const dict = await getDictionary(locale);
  const supabase = await createClient();
  const { data: publicProfile } = await supabase
    .from("public_profiles")
    .select("display_name, avatar_url")
    .eq("id", id)
    .single();

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
  const supabase = await createClient();
  const { data } = await supabase
    .from("public_profiles")
    .select("display_name")
    .eq("id", id)
    .single();
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
