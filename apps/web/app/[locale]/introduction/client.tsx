"use client";

import { AppLink } from "@/components/app-link";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useT } from "@/lib/i18n/locale-provider";
import type { OrganizationMember, OrganizationMemberCategory } from "@winlab/db";
import { isExternalImage, resolveImageSrc } from "@/lib/utils";
import { GraduationCap, Mail, Microscope, Plus } from "lucide-react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useState } from "react";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { OrgChart } from "./org-chart";

// Admin-only dialog. Lazy-load so the visitor bundle never ships the
// form deps (and the upload-image module they pull in).
const OrganizationMemberDialog = dynamic(
  () =>
    import("@/components/organization-member-dialog").then((m) => ({
      default: m.OrganizationMemberDialog,
    })),
  { ssr: false },
);

const TAB_VALUES: OrganizationMemberCategory[] = ["core", "legal_entity", "industry"];

const tabParser = parseAsStringLiteral(["core", "legal_entity", "industry"] as const).withDefault("core");

export function OrganizationPageClient({
  membersByCategory,
}: {
  membersByCategory: Record<OrganizationMemberCategory, OrganizationMember[]>;
}) {
  const t = useT();
  const { isAdmin } = useAuth();
  const [tab, setTab] = useQueryState("tab", tabParser);

  const tabLabels: Record<OrganizationMemberCategory, string> = {
    core: t.introduction.category.core,
    legal_entity: t.introduction.category.legalEntity,
    industry: t.introduction.category.industry,
  };
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

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 flex flex-col gap-10">
      <OrgChart activeTab={tab} />

      <div className="flex flex-col gap-6">
        <div className="flex gap-2 border-b border-border pb-2">
          {TAB_VALUES.map((value) => (
            <Button
              key={value}
              variant={tab === value ? "default" : "ghost"}
              size="sm"
              onClick={() => setTab(value)}
            >
              {tabLabels[value]}
            </Button>
          ))}
        </div>

        {isAdmin && (
          <div className="flex justify-end">
            <Button variant="secondary" onClick={openCreate}>
              <Plus className="w-4 h-4" />
              {t.actions.add}
            </Button>
          </div>
        )}

        {members.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">{t.introduction.membersPending}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
            {members.map((member) => {
              const memberContent = (
                <>
                  <div className="relative w-full aspect-square shrink-0 overflow-hidden">
                    <Image
                      src={resolveImageSrc(member.image)}
                      alt={member.name}
                      fill
                      className="object-cover"
                      unoptimized={isExternalImage(member.image)}
                    />
                  </div>

                  <div className="p-4 flex flex-col gap-2">
                    <div>
                      <p className="text-base font-bold text-foreground leading-snug">{member.name}</p>
                      {member.member_role && (
                        <p className="text-sm text-muted-foreground mt-0.5">{member.member_role}</p>
                      )}
                    </div>

                    {(member.school || member.research_areas || member.email) && (
                      <div className="flex flex-col gap-1.5">
                        {member.school && (
                          <div className="flex items-start gap-1.5 text-sm text-muted-foreground">
                            <GraduationCap className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <span>{member.school}</span>
                          </div>
                        )}
                        {member.research_areas && (
                          <div className="flex items-start gap-1.5 text-sm text-muted-foreground">
                            <Microscope className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <span>{member.research_areas}</span>
                          </div>
                        )}
                        {member.email && (
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Mail className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{member.email}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </>
              );

              if (isAdmin) {
                return (
                  <button
                    key={member.id}
                    type="button"
                    className="text-left"
                    onClick={() => openEdit(member)}
                  >
                    <Card className="py-0 overflow-hidden flex flex-col cursor-pointer interactive-scale h-full">
                      {memberContent}
                    </Card>
                  </button>
                );
              }

              if (member.website) {
                return (
                  <AppLink key={member.id} href={member.website!} className="block">
                    <Card className="py-0 overflow-hidden flex flex-col interactive-scale h-full">
                      {memberContent}
                    </Card>
                  </AppLink>
                );
              }

              return (
                <Card key={member.id} className="py-0 overflow-hidden flex flex-col h-full">
                  {memberContent}
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
