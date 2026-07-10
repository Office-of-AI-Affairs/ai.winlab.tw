import { ProfilePageClient } from "./client";
import { composeProfile } from "@winlab/domain";
import { createPublicClient } from "@/lib/supabase/public";
import { getViewer } from "@/lib/supabase/get-viewer";
import type { ExternalResult, Profile, PublicProfile, Result } from "@winlab/db";
import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/site";
import { defaultLocale, isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { localeAlternates } from "@/lib/i18n/seo";
import { redirect } from "next/navigation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale: raw, id } = await params;
  const locale: Locale = isLocale(raw) ? raw : defaultLocale;
  const dict = await getDictionary(locale);
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("public_profiles")
    .select("display_name")
    .eq("id", id)
    .maybeSingle();
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
      locale: "zh_TW",
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
  const { supabase, user, isAdmin } = await getViewer();

  const isOwner = user?.id === id;
  const canViewPrivateProfile = Boolean(user);

  const [publicProfileRes, publicProfileResumeRes, privateProfileRes, resultsRes, externalResultsRes, coauthoredRes, participantsRes] = await Promise.all([
    // public_profiles now mirrors display fields (bio / social links / role) so
    // non-admin viewers can still see someone else's profile card without
    // needing direct RLS access to the private profiles row.
    //
    // `resume` is intentionally excluded here: this query also runs for
    // anonymous visitors, and public_profiles is anon-readable (RLS
    // `using(true)`). Selecting resume unconditionally would let anon
    // enumerate every member's résumé storage path. Signed-in viewers still
    // get it — see publicProfileResumeRes below and profiles.resume above.
    supabase
      .from("public_profiles")
      .select("id, created_at, updated_at, display_name, avatar_url, bio, linkedin, facebook, github, website, social_links, role")
      .eq("id", id)
      .single(),
    // Resume fallback for signed-in viewers who can't read the target's
    // `profiles` row directly (not self/admin/recruitment_owner) but should
    // still see the résumé link per product behavior. Only runs when a user
    // is signed in, so this never touches public_profiles.resume as anon.
    canViewPrivateProfile
      ? supabase
          .from("public_profiles")
          .select("resume")
          .eq("id", id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    // private profile only resolves for self / admin / recruitment_owner-of-applicant
    // (RLS tightened 2026-05-18). For everyone else this falls through to null
    // and composeProfile uses public_profiles for the card fields.
    canViewPrivateProfile
      ? supabase
          .from("profiles")
          .select("id, created_at, updated_at, display_name, avatar_url, role, bio, phone, linkedin, facebook, github, website, resume, social_links")
          .eq("id", id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase
      .from("results")
      .select("*")
      .eq("author_id", id)
      .order("date", { ascending: false }),
    supabase
      .from("external_results")
      .select("*")
      .eq("user_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("result_coauthors")
      .select("result_id")
      .eq("user_id", id),
    isOwner
      ? supabase
          .from("event_participants")
          .select("event_id")
          .eq("user_id", id)
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (publicProfileRes.error || !publicProfileRes.data) redirect("/");

  const authoredResults = (resultsRes.data as Result[]) || [];
  const coauthorResultIds = (coauthoredRes.data ?? []).map((r) => r.result_id);
  let coauthoredResults: Result[] = [];
  if (coauthorResultIds.length) {
    const { data: coResults } = await supabase
      .from("results")
      .select("*")
      .in("id", coauthorResultIds)
      .order("date", { ascending: false });
    coauthoredResults = (coResults as Result[]) ?? [];
  }

  const authoredIds = new Set(authoredResults.map((r) => r.id));
  const rawResults = [
    ...authoredResults,
    ...coauthoredResults.filter((r) => !authoredIds.has(r.id)),
  ];
  const eventIds = [...new Set(rawResults.map((r) => r.event_id).filter(Boolean))] as string[];

  const participantEventIds = (participantsRes.data ?? []).map((p: { event_id: string }) => p.event_id);
  const allEventIds = [...new Set([...eventIds, ...participantEventIds])];

  const eventSlugMap: Record<string, string> = {};
  const eventNameMap: Record<string, string> = {};
  let participatedEvents: { id: string; name: string; slug: string }[] = [];

  if (allEventIds.length) {
    const { data: events } = await supabase
      .from("events")
      .select("id, name, slug")
      .in("id", allEventIds);
    for (const e of events ?? []) {
      eventSlugMap[e.id] = e.slug;
      eventNameMap[e.id] = e.name;
    }
  }

  if (isOwner) {
    if (isAdmin) {
      const { data: allEvents } = await supabase
        .from("events")
        .select("id, name, slug")
        .eq("status", "published")
        .order("sort_order", { ascending: true });
      participatedEvents = (allEvents ?? []).map((e) => ({ id: e.id, name: e.name, slug: e.slug }));
      for (const e of allEvents ?? []) {
        eventSlugMap[e.id] = e.slug;
        eventNameMap[e.id] = e.name;
      }
    } else {
      participatedEvents = Object.entries(eventNameMap)
        .filter(([id]) => participantEventIds.includes(id))
        .map(([id, name]) => ({ id, name, slug: eventSlugMap[id] }));
    }
  }

  const results = isOwner ? rawResults : rawResults.filter((r) => r.status === "published");
  const externalResults = (externalResultsRes.data as ExternalResult[]) || [];
  const publicProfileWithResume: PublicProfile = {
    ...(publicProfileRes.data as PublicProfile),
    resume: publicProfileResumeRes.data?.resume ?? null,
  };
  const visibleProfile = composeProfile(
    publicProfileWithResume,
    privateProfileRes.data as Partial<Profile> | null
  );

  return (
    <ProfilePageClient
      initialProfile={visibleProfile}
      results={results}
      isOwner={isOwner}
      canViewPrivateProfile={canViewPrivateProfile}
      eventSlugMap={eventSlugMap}
      eventNameMap={eventNameMap}
      participatedEvents={participatedEvents}
      initialExternalResults={externalResults}
    />
  );
}
