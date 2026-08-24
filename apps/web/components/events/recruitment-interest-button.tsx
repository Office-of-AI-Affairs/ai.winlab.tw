"use client";

import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/locale-provider";
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
  const t = useT();
  const [interested, setInterested] = useState(initialInterested);
  const [count, setCount] = useState(initialCount);
  const [isPending, setIsPending] = useState(false);

  async function handleToggle() {
    if (isPending) return;

    if (!hasResume) {
      toast.error(t.recruitment.interest.needResumeToast);
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

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setInterested((prev) => !prev);
      setCount((prev) => nextInterested ? prev - 1 : prev + 1);
      setIsPending(false);
      toast.error(t.common.loginFirst);
      return;
    }

    if (nextInterested) {
      const result = await supabase
        .from("recruitment_interests")
        .insert({ competition_id: competitionId, user_id: user.id });
      error = result.error;
    } else {
      const result = await supabase
        .from("recruitment_interests")
        .delete()
        .eq("competition_id", competitionId)
        .eq("user_id", user.id);
      error = result.error;
    }

    if (error) {
      // Revert on error using functional updaters to avoid stale closure
      setInterested((prev) => !prev);
      setCount((prev) => nextInterested ? prev - 1 : prev + 1);
      toast.error(t.common.actionFailedRetry);
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
        {interested
          ? t.recruitment.interest.interested
          : t.recruitment.interest.express}
        <span className="ml-1 rounded-full bg-background/20 px-2 py-0.5 text-xs font-semibold tabular-nums">
          {t.recruitment.interest.count.replace("{count}", String(count))}
        </span>
      </Button>
      {!hasResume && (
        <p className="text-sm text-muted-foreground">
          {t.recruitment.interest.needResumeHint}
        </p>
      )}
    </div>
  );
}
