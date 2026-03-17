"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OrgChart } from "./org-chart";
import { createClient } from "@/lib/supabase/client";
import type { OrganizationMember, OrganizationMemberCategory } from "@/lib/supabase/types";
import { isExternalImage } from "@/lib/utils";
import { ExternalLink, Loader2, Mail, Plus } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

const TABS: { value: OrganizationMemberCategory; label: string }[] = [
  { value: "core", label: "核心成員" },
  { value: "legal_entity", label: "法人" },
  { value: "industry", label: "產業" },
];

export function OrganizationPageClient({
  membersByCategory,
  isAdmin,
}: {
  membersByCategory: Record<OrganizationMemberCategory, OrganizationMember[]>;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<OrganizationMemberCategory>("core");
  const [isCreating, setIsCreating] = useState(false);

  const members = membersByCategory[tab] ?? [];

  const handleCreate = async () => {
    if (!isAdmin) return;
    setIsCreating(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("organization_members")
      .insert({
        category: tab,
        name: "新成員",
        summary: null,
        image: null,
        link: null,
        sort_order: 0,
        school: null,
        research_areas: null,
        email: null,
        website: null,
        member_role: null,
      })
      .select()
      .single();
    if (error) { setIsCreating(false); return; }
    router.push(`/organization/${data.id}/edit`);
  };

  const handleCardClick = (member: OrganizationMember) => {
    if (isAdmin) {
      router.push(`/organization/${member.id}/edit`);
      return;
    }
    if (member.website) {
      window.open(member.website, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 flex flex-col gap-10">
      <OrgChart />

      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex gap-1 border-b border-border pb-2 flex-1">
            {TABS.map(({ value, label }) => (
              <Button
                key={value}
                variant={tab === value ? "default" : "ghost"}
                size="sm"
                onClick={() => setTab(value)}
              >
                {label}
              </Button>
            ))}
          </div>
          {isAdmin && tab !== "core" && (
            <Button variant="secondary" onClick={handleCreate} disabled={isCreating}>
              {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              新增
            </Button>
          )}
        </div>

        {members.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">此分類目前沒有成員</div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {members.map((member) => {
              const isClickable = isAdmin || !!member.website;
              return (
                <Card
                  key={member.id}
                  className={`py-0 h-full flex flex-col overflow-hidden ${
                    isClickable ? "cursor-pointer transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]" : ""
                  }`}
                  onClick={isClickable ? () => handleCardClick(member) : undefined}
                >
                  <div className="relative w-full aspect-square shrink-0 overflow-hidden">
                    <Image
                      src={member.image || "/placeholder.png"}
                      alt={member.name}
                      fill
                      className="object-cover"
                      unoptimized={isExternalImage(member.image)}
                    />
                  </div>
                  <CardHeader className="shrink-0 pb-2 pt-4">
                    <CardTitle className="text-lg font-bold">{member.name}</CardTitle>
                    {member.member_role && (
                      <p className="text-sm text-muted-foreground">{member.member_role}</p>
                    )}
                  </CardHeader>
                  <CardContent className="flex flex-col gap-2 pb-4 text-sm">
                    {member.school && (
                      <div>
                        <span className="text-muted-foreground text-xs">最高學歷　</span>
                        <span>{member.school}</span>
                      </div>
                    )}
                    {member.research_areas && (
                      <div>
                        <span className="text-muted-foreground text-xs">研究領域　</span>
                        <span>{member.research_areas}</span>
                      </div>
                    )}
                    {member.email && (
                      <a
                        href={`mailto:${member.email}`}
                        className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Mail className="w-3.5 h-3.5 shrink-0" />
                        <span className="text-xs truncate">{member.email}</span>
                      </a>
                    )}
                    {member.website && (
                      <a
                        href={member.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                        <span className="text-xs truncate">個人網頁</span>
                      </a>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
