"use client";

import { useAuth } from "@/components/layout/auth-provider";
import { insertRow, updateRow } from "@/lib/actions/rows";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";

export function useEventActions(eventId: string, slug: string, userId: string | null) {
  const router = useRouter();
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
    // No slug: the announcements_set_slug trigger derives a unique one.
    const result = await insertRow("announcements", {
      title: "新公告",
      category: "一般",
      date: new Date().toISOString().slice(0, 10),
      content: {},
      status: "draft",
      author_id: userId,
      event_id: eventId,
    }).catch(() => null);
    if (!result?.ok) {
      setIsCreatingAnnouncement(false);
      toast.error(result?.error === "Forbidden" ? "沒有權限建立公告" : "操作失敗");
      return;
    }
    router.push(`/events/${slug}/announcements/${encodeURIComponent(String(result.row.slug))}?mode=edit`);
  }, [eventId, isAdmin, router, slug, userId]);

  const createResult = useCallback(async () => {
    if (!userId) return;
    setIsCreatingResult(true);
    const today = new Date().toISOString().slice(0, 10);
    const result = await insertRow("results", {
      title: "新成果",
      summary: "",
      content: {},
      status: "draft",
      date: today,
      author_id: userId,
      event_id: eventId,
    }).catch(() => null);
    if (!result?.ok) {
      setIsCreatingResult(false);
      toast.error(result?.error === "Forbidden" ? "沒有權限建立成果" : "操作失敗");
      return;
    }
    router.push(`/events/${slug}/results/${result.row.id}?mode=edit`);
  }, [eventId, router, slug, userId]);

  const togglePin = useCallback(
    async (table: "results" | "competitions", id: string, pinned: boolean) => {
      const result = await updateRow(table, id, { pinned }).catch(() => null);
      if (!result?.ok) { toast.error("操作失敗"); return; }
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
