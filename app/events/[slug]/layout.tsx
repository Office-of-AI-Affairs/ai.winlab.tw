import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
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

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
