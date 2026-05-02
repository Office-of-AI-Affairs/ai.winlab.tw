"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

export function useEventActions(eventId: string, slug: string, userId: string | null) {
  const router = useRouter();
  const supabaseRef = useRef(createClient());
  const [isCreatingAnnouncement, setIsCreatingAnnouncement] = useState(false);
  const [isCreatingResult, setIsCreatingResult] = useState(false);

  const createAnnouncement = useCallback(async () => {
    if (!userId) return;
    setIsCreatingAnnouncement(true);
    const { data, error } = await supabaseRef.current
      .from("announcements")
      .insert({
        title: "新公告",
        category: "一般",
        date: new Date().toISOString().slice(0, 10),
        content: {},
        status: "draft",
        author_id: userId,
        event_id: eventId,
      })
      .select()
      .single();
    if (error) { setIsCreatingAnnouncement(false); toast.error("操作失敗"); return; }
    router.push(`/events/${slug}/announcements/${data.id}?mode=edit`);
  }, [eventId, router, slug, userId]);

  const createResult = useCallback(async () => {
    if (!userId) return;
    setIsCreatingResult(true);
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabaseRef.current
      .from("results")
      .insert({
        title: "新成果",
        summary: "",
        content: {},
        status: "draft",
        date: today,
        author_id: userId,
        event_id: eventId,
      })
      .select()
      .single();
    if (error) { setIsCreatingResult(false); toast.error("操作失敗"); return; }
    router.push(`/events/${slug}/results/${data.id}?mode=edit`);
  }, [eventId, router, slug, userId]);

  const togglePin = useCallback(
    async (table: "results" | "competitions", id: string, pinned: boolean) => {
      const { error } = await supabaseRef.current.from(table).update({ pinned }).eq("id", id);
      if (error) { toast.error("操作失敗"); return; }
      router.refresh();
    },
    [router],
  );

  return {
    isCreating: isCreatingAnnouncement || isCreatingResult,
    isCreatingAnnouncement,
    isCreatingResult,
    createAnnouncement,
    createResult,
    togglePin,
  };
}
