"use client";

import { AppLink } from "@/components/app-link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { OrganizationMemberDialog } from "@/components/organization-member-dialog";
import type { OrganizationMember, OrganizationMemberCategory } from "@/lib/supabase/types";
import { isExternalImage } from "@/lib/utils";
import { GraduationCap, Mail, Microscope, Plus } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { OrgChart } from "./org-chart";

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
  const tabParser = parseAsStringLiteral(["core", "legal_entity", "industry"] as const).withDefault("core");
  const [tab, setTab] = useQueryState("tab", tabParser);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<OrganizationMember | null>(null);

  const members = membersByCategory[tab] ?? [];

  const openCreate = () => {
    setEditingMember(null);
    setDialogOpen(true);
  };

  const openEdit = (member: OrganizationMember) => {
    setEditingMember(member);
    setDialogOpen(true);
  };

  const handleCardClick = (member: OrganizationMember) => {
    if (isAdmin) {
      openEdit(member);
      return;
    }
    if (member.website) {
      window.open(member.website, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 flex flex-col gap-10">
      <OrgChart activeTab={tab} />

      <div className="flex flex-col gap-6">
        <div className="flex gap-2 border-b border-border pb-2">
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

        {isAdmin && (
          <div className="flex justify-end">
            <Button variant="secondary" onClick={openCreate}>
              <Plus className="w-4 h-4" />
              新增
            </Button>
          </div>
        )}

        {members.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">此分類目前沒有成員</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {members.map((member) => {
              const isClickable = isAdmin || !!member.website;
              return (
                <Card
                  key={member.id}
                  className={`py-0 overflow-hidden flex flex-col ${
                    isClickable
                      ? "cursor-pointer interactive-scale"
                      : ""
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

                  <div className="p-5 flex flex-col gap-3">
                    <div>
                      <p className="text-xl font-bold text-foreground leading-snug">{member.name}</p>
                      {member.member_role && (
                        <p className="text-base text-muted-foreground mt-0.5">{member.member_role}</p>
                      )}
                    </div>

                    {(member.school || member.research_areas || member.email) && (
                      <div className="flex flex-col gap-2">
                        {member.school && (
                          <div className="flex items-start gap-2 text-base text-muted-foreground">
                            <GraduationCap className="w-4 h-4 shrink-0 mt-0.5" />
                            <span>{member.school}</span>
                          </div>
                        )}
                        {member.research_areas && (
                          <div className="flex items-start gap-2 text-base text-muted-foreground">
                            <Microscope className="w-4 h-4 shrink-0 mt-0.5" />
                            <span>{member.research_areas}</span>
                          </div>
                        )}
                        {member.email && (
                          <AppLink
                            href={`mailto:${member.email}`}
                            className="flex items-center gap-2 text-base text-muted-foreground"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Mail className="w-4 h-4 shrink-0" />
                            <span className="truncate">{member.email}</span>
                          </AppLink>
                        )}
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {dialogOpen && (
        <OrganizationMemberDialog
          key={editingMember?.id ?? `new-${tab}`}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          member={editingMember}
          defaultCategory={tab}
        />
      )}
    </div>
  );
}
