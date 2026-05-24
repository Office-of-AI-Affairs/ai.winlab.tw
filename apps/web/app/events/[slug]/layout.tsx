import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { JsonLd } from "@/components/json-ld";
import type { Metadata } from "next";

const getEventMeta = unstable_cache(
  async (slug: string) => {
    const supabase = createPublicClient();
    const { data } = await supabase
      .from("events")
      .select("name, description, cover_image")
      .eq("slug", slug)
      .maybeSingle();
    return data as { name: string; description: string | null; cover_image: string | null } | null;
  },
  ["event-meta"],
  { tags: ["events-published"], revalidate: 3600 },
);

// Fallback metadata for the /events/[slug] tree. Each tab-listing page
// (announcements / results / recruitment / members) overrides title +
// canonical + openGraph.url with its own keyword-focused variant.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await getEventMeta(slug);

  const name = data?.name ?? "活動";
  const description = data?.description ?? `${name} — 國立陽明交通大學人工智慧專責辦公室`;
  const ogImages = data?.cover_image
    ? [{ url: data.cover_image, width: 1200, height: 630, alt: name }]
    : [];
  return {
    title: `${name}｜人工智慧專責辦公室`,
    description,
    alternates: {
      canonical: `/events/${slug}`,
    },
    openGraph: {
      title: `${name}｜人工智慧專責辦公室`,
      description,
      url: `/events/${slug}`,
      images: ogImages,
    },
  };
}

// Event JSON-LD lives on the layout so it's emitted on every tab listing
// (announcements / results / recruitment / members) without duplicating
// the structured data block in four sibling page.tsx files.
export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getEventMeta(slug);
  const structuredData = data
    ? {
        "@context": "https://schema.org",
        "@type": "Event",
        name: data.name,
        description: data.description ?? `${data.name} 活動頁面`,
        url: `https://ai.winlab.tw/events/${slug}`,
        eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
        organizer: {
          "@type": "Organization",
          name: "國立陽明交通大學 人工智慧專責辦公室",
          url: "https://ai.winlab.tw",
        },
      }
    : null;

  return (
    <>
      {structuredData && <JsonLd data={structuredData} />}
      {children}
    </>
  );
}
