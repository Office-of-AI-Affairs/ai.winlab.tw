"use client";

import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import type {
  OrganizationMember,
  OrganizationMemberCategory,
} from "@/lib/supabase/types";
import { isExternalImage } from "@/lib/utils";
import { Loader2, Plus } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const CATEGORIES: { value: OrganizationMemberCategory; label: string }[] = [
  { value: "ai_newcomer", label: "AI 新秀" },
  { value: "industry_academy", label: "產學聯盟" },
  { value: "alumni", label: "校友" },
];

export default function OrganizationPage() {
  const { isAdmin } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  const [tab, setTab] = useState<OrganizationMemberCategory>("ai_newcomer");
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  const fetchMembers = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("organization_members")
      .select("*")
      .eq("category", tab)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) console.error("Error fetching organization members:", error);
    else setMembers((data as OrganizationMember[]) || []);
    setIsLoading(false);
  }, [supabase, tab]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleCreate = async () => {
    if (!isAdmin) return;
    setIsCreating(true);
    const { data, error } = await supabase
      .from("organization_members")
      .insert({ category: tab, name: "新成員", summary: null, image: null, link: null, sort_order: 0 })
      .select()
      .single();
    if (error) { setIsCreating(false); return; }
    router.push(`/organization/${data.id}/edit`);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 flex flex-col gap-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">組織人員</h1>
        {isAdmin && (
          <Button variant="secondary" onClick={handleCreate} disabled={isCreating}>
            {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            新增
          </Button>
        )}
      </div>

      <div className="flex gap-2 border-b border-border pb-2">
        {CATEGORIES.map(({ value, label }) => (
          <Button key={value} variant={tab === value ? "default" : "ghost"} size="sm" onClick={() => setTab(value)}>
            {label}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : members.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">此分類目前沒有成員</div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {members.map((member) => {
            const isClickable = isAdmin || !!member.link;

            const handleCardClick = () => {
              if (isAdmin) {
                router.push(`/organization/${member.id}/edit`);
                return;
              }
              if (!member.link) return;

              if (member.link.startsWith("/")) {
                router.push(member.link);
              } else {
                window.open(member.link, "_blank", "noopener,noreferrer");
              }
            };

            return (
              <Card
                key={member.id}
                className={`py-0 h-full flex flex-col overflow-hidden ${
                  isClickable
                    ? "cursor-pointer transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]"
                    : ""
                }`}
                onClick={isClickable ? handleCardClick : undefined}
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
                <CardHeader className="shrink-0 pb-4">
                  <CardTitle className="text-lg font-bold line-clamp-2">
                    {member.name}
                  </CardTitle>
                  {member.summary && (
                    <CardDescription className="line-clamp-3">
                      {member.summary}
                    </CardDescription>
                  )}
                </CardHeader>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
