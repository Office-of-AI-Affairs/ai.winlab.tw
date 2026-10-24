import { ProfilePageClient } from "./client";
import { eq } from "drizzle-orm";
import { getViewer } from "@/lib/auth/viewer";
import { db } from "@/lib/db";
import { public_profiles } from "@/lib/db/schema";
import { getProfilePageData } from "@/lib/data/profile";
import { isUuid } from "@/lib/slug";
import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/site";
import { defaultLocale, isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { localeAlternates, ogLocale } from "@/lib/i18n/seo";
import { redirect } from "next/navigation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale: raw, id } = await params;
  const locale: Locale = isLocale(raw) ? raw : defaultLocale;
  const dict = await getDictionary(locale);
  const [data] = isUuid(id)
    ? await db
        .select({ display_name: public_profiles.display_name })
        .from(public_profiles)
        .where(eq(public_profiles.id, id))
        .limit(1)
    : [];
  const name = data?.display_name?.trim() || dict.profile.metaNameFallback;
  const title = dict.profile.metaTitleSuffix.replace("{name}", name);
  const description = dict.profile.metaDescription.replace("{name}", name);
  const a = localeAlternates(`/profile/${id}`, locale);
  return {
    title,
    description,
    alternates: { canonical: a.canonical, languages: a.languages },
    // Next.js App Router performs object-level replace (not deep merge) when a
    // child segment exports openGraph. All required fields must be declared here
    // explicitly; relying on layout.tsx inheritance silently drops og:image.
    openGraph: {
      type: "profile",
      siteName: SITE_NAME,
      locale: ogLocale(locale),
      title,
      description,
      url: `/profile/${id}`,
      images: [
        {
          url: "/og.png",
          width: 1200,
          height: 630,
          alt: name,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/og.png"],
    },
  };
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getProfilePageData(id, await getViewer());
  if (!data) redirect("/");

  return (
    <ProfilePageClient
      initialProfile={data.profile}
      results={data.results}
      isOwner={data.isOwner}
      canViewPrivateProfile={data.canViewPrivateProfile}
      eventSlugMap={data.eventSlugMap}
      eventNameMap={data.eventNameMap}
      participatedEvents={data.participatedEvents}
      initialExternalResults={data.externalResults}
    />
  );
}
