"use client";

import { useAuth } from "@/components/layout/auth-provider";
import { createClient } from "@/lib/supabase/client";
import { generateUniqueAnnouncementSlug } from "@/lib/slug";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

function isRlsViolation(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === "42501" || /row-level security/i.test(error.message ?? "");
}

export function useEventActions(eventId: string, slug: string, userId: string | null) {
  const router = useRouter();
  const supabaseRef = useRef(createClient());
  const { isAdmin } = useAuth();
  const [isCreatingAnnouncement, setIsCreatingAnnouncement] = useState(false);
  const [isCreatingResult, setIsCreatingResult] = useState(false);

  const createAnnouncement = useCallback(async () => {
    if (!userId) return;
    if (!isAdmin) {
      toast.error("只有管理員可以建立公告");
      return;
    }
    setIsCreatingAnnouncement(true);
    const title = "新公告";
    const newSlug = await generateUniqueAnnouncementSlug(supabaseRef.current, title);
    const { data, error } = await supabaseRef.current
      .from("announcements")
      .insert({
        title,
        slug: newSlug,
        category: "一般",
        date: new Date().toISOString().slice(0, 10),
        content: {},
        status: "draft",
        author_id: userId,
        event_id: eventId,
      })
      .select()
      .single();
    if (error) {
      setIsCreatingAnnouncement(false);
      toast.error(isRlsViolation(error) ? "沒有權限建立公告" : "操作失敗");
      return;
    }
    router.push(`/events/${slug}/announcements/${encodeURIComponent(data.slug)}?mode=edit`);
  }, [eventId, isAdmin, router, slug, userId]);

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
    if (error) {
      setIsCreatingResult(false);
      toast.error(isRlsViolation(error) ? "沒有權限建立成果" : "操作失敗");
      return;
    }
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
