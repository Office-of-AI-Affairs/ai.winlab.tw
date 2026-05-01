import { OrganizationPageClient } from "./client";
import { getIntroduction, getOrganizationMembers } from "./data";
import { IntroductionDetail } from "@/components/introduction-detail";
import { IntroductionEditButton } from "@/components/introduction-edit-button";
import { JsonLd } from "@/components/json-ld";
import { PageShell } from "@/components/page-shell";
import { renderArticle } from "@/lib/ui/rich-text";
import { estimateReadingTime } from "@/lib/ui/reading-time";
import { ShareButtons } from "@/components/share-buttons";
import type { OrganizationMember, OrganizationMemberCategory } from "@/lib/supabase/types";
import type { Metadata } from "next";

const CATEGORIES: OrganizationMemberCategory[] = ["core", "legal_entity", "industry"];

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
  const contentHtml = html ?? "";
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
        <IntroductionDetail
          title={introduction?.title || "國立陽明交通大學 人工智慧專責辦公室"}
          contentHtml={contentHtml}
          actions={
            <div className="flex items-center gap-3">
              <ShareButtons url="/introduction" title="組織｜人工智慧專責辦公室" />
              <IntroductionEditButton />
            </div>
          }
          toc={toc}
          readingTimeMin={readingTimeMin}
        />
      </PageShell>
      <OrganizationPageClient membersByCategory={membersByCategory} />
    </>
  );
}
