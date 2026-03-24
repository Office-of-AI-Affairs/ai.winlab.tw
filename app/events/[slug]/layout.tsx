import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .select("name, description, cover_image")
    .eq("slug", slug)
    .single();

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
