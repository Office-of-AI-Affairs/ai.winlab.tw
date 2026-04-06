"use client";

import { useAutoSave } from "@/hooks/use-auto-save";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type Options<T extends Record<string, unknown>> = {
  table: string;
  id: string;
  initialData: T;
  fields: (keyof T & string)[];
  redirectTo: string;
  publishable?: boolean;
  statusField?: keyof T & string;
  onBeforeSave?: () => Promise<boolean>;
  onAfterSave?: () => void;
};

export function useContentEditor<T extends Record<string, unknown>>({
  table,
  id,
  initialData,
  fields,
  redirectTo,
  publishable = true,
  statusField = "status" as keyof T & string,
  onBeforeSave,
  onAfterSave,
}: Options<T>) {
  const router = useRouter();
  const supabaseRef = useRef(createClient());

  const [data, setData] = useState<T>(initialData);
  const [savedData, setSavedData] = useState<T>(initialData);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const onBeforeSaveRef = useRef(onBeforeSave);
  const onAfterSaveRef = useRef(onAfterSave);
  useEffect(() => { onBeforeSaveRef.current = onBeforeSave; }, [onBeforeSave]);
  useEffect(() => { onAfterSaveRef.current = onAfterSave; }, [onAfterSave]);

  const hasChanges = fields.some((f) => {
    const a = data[f];
    const b = savedData[f];
    return typeof a === "object" || typeof b === "object"
      ? JSON.stringify(a) !== JSON.stringify(b)
      : a !== b;
  });

  const save = useCallback(async () => {
    if (onBeforeSaveRef.current) {
      const proceed = await onBeforeSaveRef.current();
      if (!proceed) return;
    }
    setIsSaving(true);
    const payload = Object.fromEntries(fields.map((f) => [f, data[f] ?? null]));
    const { error } = await supabaseRef.current.from(table).update(payload).eq("id", id);
    if (error) {
      toast.error("儲存失敗");
    } else {
      setSavedData({ ...data });
      onAfterSaveRef.current?.();
    }
    setIsSaving(false);
  }, [data, fields, id, table]);

  const { guardNavigation } = useAutoSave({ hasChanges, onSave: save });

  const publish = useCallback(async () => {
    if (!publishable) return;
    setIsPublishing(true);
    const currentStatus = data[statusField];
    const newStatus = currentStatus === "published" ? "draft" : "published";
    const payload = {
      ...Object.fromEntries(fields.map((f) => [f, data[f] ?? null])),
      [statusField]: newStatus,
    };
    const { error } = await supabaseRef.current.from(table).update(payload).eq("id", id);
    if (error) {
      toast.error("發布失敗");
    } else {
      const updated = { ...data, [statusField]: newStatus } as T;
      setData(updated);
      setSavedData(updated);
      toast.success(newStatus === "published" ? "已發布" : "已取消發布");
    }
    setIsPublishing(false);
  }, [data, fields, id, publishable, statusField, table]);

  const remove = useCallback(async () => {
    if (!confirm("確定要刪除嗎？")) return;
    setIsDeleting(true);
    const { error } = await supabaseRef.current.from(table).delete().eq("id", id);
    if (error) {
      toast.error("刪除失敗");
      setIsDeleting(false);
      return;
    }
    router.push(redirectTo);
  }, [id, redirectTo, router, table]);

  return {
    data, setData, hasChanges,
    isSaving, isPublishing, isDeleting,
    save, publish, remove, guardNavigation,
  };
}
