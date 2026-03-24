"use client";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { Heart } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type RecruitmentInterestButtonProps = {
  competitionId: string;
  initialInterested: boolean;
  initialCount: number;
  hasResume: boolean;
};

export function RecruitmentInterestButton({
  competitionId,
  initialInterested,
  initialCount,
  hasResume,
}: RecruitmentInterestButtonProps) {
  const [interested, setInterested] = useState(initialInterested);
  const [count, setCount] = useState(initialCount);
  const [isPending, setIsPending] = useState(false);

  async function handleToggle() {
    if (isPending) return;

    if (!hasResume) {
      toast.error("請先到個人頁面上傳履歷");
      return;
    }

    setIsPending(true);

    const nextInterested = !interested;
    const nextCount = nextInterested ? count + 1 : count - 1;

    // Optimistic update
    setInterested(nextInterested);
    setCount(nextCount);

    const supabase = createClient();
    let error: unknown = null;

    if (nextInterested) {
      const result = await supabase
        .from("recruitment_interests")
        .insert({ competition_id: competitionId });
      error = result.error;
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const result = await supabase
          .from("recruitment_interests")
          .delete()
          .eq("competition_id", competitionId)
          .eq("user_id", user.id);
        error = result.error;
      }
    }

    if (error) {
      // Revert on error
      setInterested(interested);
      setCount(count);
      toast.error("操作失敗，請稍後再試");
    }

    setIsPending(false);
  }

  return (
    <div className="mt-8 space-y-2">
      <Button
        variant={interested ? "default" : "outline"}
        aria-pressed={interested}
        onClick={handleToggle}
        disabled={isPending}
        className="gap-2"
      >
        <Heart className={interested ? "fill-current" : ""} />
        {interested ? "已感興趣" : "我感興趣"}
        <span className="ml-1 rounded-full bg-background/20 px-2 py-0.5 text-xs font-semibold tabular-nums">
          {count} 人感興趣
        </span>
      </Button>
      {!hasResume && (
        <p className="text-sm text-muted-foreground">
          請先到個人頁面上傳履歷，以便廠商查看
        </p>
      )}
    </div>
  );
}
