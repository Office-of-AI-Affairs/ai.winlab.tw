import { JsonLd } from "@/components/json-ld";
import { PageShell } from "@/components/page-shell";
import { renderArticle } from "@/lib/ui/rich-text";
import { estimateReadingTime } from "@/lib/ui/reading-time";
import type { Introduction, OrganizationMember, OrganizationMemberCategory } from "@/lib/supabase/types";
import type { Metadata } from "next";
import { IntroductionArticleClient } from "./article-client";
import { OrganizationPageClient } from "./client";
import { getIntroduction, getOrganizationMembers } from "./data";

const CATEGORIES: OrganizationMemberCategory[] = ["core", "legal_entity", "industry"];

const FALLBACK_INTRODUCTION = {
  id: "",
  title: "國立陽明交通大學 人工智慧專責辦公室",
  content: {} as Record<string, unknown>,
  created_at: "",
  updated_at: "",
} as unknown as Introduction;

export const metadata: Metadata = {
  title: "組織｜人工智慧專責辦公室",
  description: "認識國立陽明交通大學人工智慧專責辦公室的定位、任務與組織成員。",
  alternates: {
    canonical: "/introduction",
  },
  openGraph: {
    title: "組織｜人工智慧專責辦公室",
    description: "認識國立陽明交通大學人工智慧專責辦公室的定位、任務與組織成員。",
    url: "/introduction",
  },
};

export default async function OrganizationPage() {
  const [introduction, members] = await Promise.all([
    getIntroduction(),
    getOrganizationMembers(),
  ]);

  const { html, toc } = renderArticle(introduction?.content);
  const { minutes: readingTimeMin } = estimateReadingTime(introduction?.content);

  const membersByCategory = Object.fromEntries(
    CATEGORIES.map((cat) => [cat, members.filter((m) => m.category === cat)])
  ) as Record<OrganizationMemberCategory, OrganizationMember[]>;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "組織｜人工智慧專責辦公室",
    description: "認識國立陽明交通大學人工智慧專責辦公室的定位、任務與組織成員。",
    url: "https://ai.winlab.tw/introduction",
  };

  return (
    <>
      <JsonLd data={structuredData} />
      <PageShell>
        <IntroductionArticleClient
          initialIntroduction={(introduction as Introduction | null) ?? FALLBACK_INTRODUCTION}
          initialContentHtml={html}
          initialToc={toc}
          readingTimeMin={readingTimeMin}
        />
      </PageShell>
      <OrganizationPageClient membersByCategory={membersByCategory} />
    </>
  );
}
