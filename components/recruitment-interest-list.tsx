"use client";

import { AppLink } from "@/components/app-link";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, FileText } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

type Applicant = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  resume: string | null;
};

type RecruitmentInterestListProps = {
  applicants: Applicant[];
  count: number;
};

export function RecruitmentInterestList({
  applicants,
  count,
}: RecruitmentInterestListProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-8 space-y-3">
      <Button
        variant="outline"
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
        className="gap-2"
      >
        {expanded ? <ChevronUp /> : <ChevronDown />}
        {count} 人感興趣
      </Button>

      {expanded && (
        <div className="divide-y rounded-lg border">
          {applicants.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">
              目前尚無人表達感興趣
            </p>
          ) : (
            applicants.map((applicant) => (
              <div
                key={applicant.id}
                className="flex items-start gap-3 px-4 py-4"
              >
                {/* Avatar */}
                <AppLink
                  href={`/profile/${applicant.id}`}
                  className="shrink-0"
                  interactive={false}
                >
                  {applicant.avatar_url ? (
                    <Image
                      src={applicant.avatar_url}
                      alt={applicant.display_name ?? "使用者"}
                      width={40}
                      height={40}
                      className="rounded-full object-cover interactive-scale duration-200"
                    />
                  ) : (
                    <div className="flex size-10 items-center justify-center rounded-full bg-muted text-sm font-medium text-muted-foreground interactive-scale duration-200">
                      {(applicant.display_name ?? "?")[0].toUpperCase()}
                    </div>
                  )}
                </AppLink>

                {/* Info */}
                <div className="min-w-0 flex-1 space-y-0.5">
                  <AppLink
                    href={`/profile/${applicant.id}`}
                    className="font-medium text-foreground hover:underline"
                  >
                    {applicant.display_name ?? "匿名使用者"}
                  </AppLink>
                  {applicant.bio && (
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {applicant.bio}
                    </p>
                  )}
                  {applicant.resume && (
                    <AppLink
                      href={`/profile/${applicant.id}/resume`}
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:underline"
                    >
                      <FileText className="size-3.5" />
                      查看履歷
                    </AppLink>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
