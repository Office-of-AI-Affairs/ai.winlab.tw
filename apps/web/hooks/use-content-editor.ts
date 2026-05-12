"use client";

import { useAutoSave } from "@/hooks/use-auto-save";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

// Generic hook over any table — the caller types the table name via N, but
// the internal query chain is loosely typed on purpose because Supabase's
// conditional types don't resolve safely under a still-generic N.
type TableName = keyof Database["public"]["Tables"];

type Options<T extends Record<string, unknown>, N extends TableName> = {
  table: N;
  id: string;
  initialData: T;
  fields: (keyof T & string)[];
  redirectTo: string;
  publishable?: boolean;
  statusField?: keyof T & string;
  onBeforeSave?: () => Promise<boolean>;
  onAfterSave?: () => void;
  onAfterPublish?: () => void | Promise<void>;
  onAfterRemove?: () => void | Promise<void>;
};

export function useContentEditor<T extends Record<string, unknown>, N extends TableName = TableName>({
  table,
  id,
  initialData,
  fields,
  redirectTo,
  publishable = true,
  statusField = "status" as keyof T & string,
  onBeforeSave,
  onAfterSave,
  onAfterPublish,
  onAfterRemove,
}: Options<T, N>) {
  const router = useRouter();
  const supabaseRef = useRef(createClient() as unknown as SupabaseClient);

  const [data, setData] = useState<T>(initialData);
  const [savedData, setSavedData] = useState<T>(initialData);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const onBeforeSaveRef = useRef(onBeforeSave);
  const onAfterSaveRef = useRef(onAfterSave);
  const onAfterPublishRef = useRef(onAfterPublish);
  const onAfterRemoveRef = useRef(onAfterRemove);
  useEffect(() => { onBeforeSaveRef.current = onBeforeSave; }, [onBeforeSave]);
  useEffect(() => { onAfterSaveRef.current = onAfterSave; }, [onAfterSave]);
  useEffect(() => { onAfterPublishRef.current = onAfterPublish; }, [onAfterPublish]);
  useEffect(() => { onAfterRemoveRef.current = onAfterRemove; }, [onAfterRemove]);

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
      await onAfterSaveRef.current?.();
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
      await onAfterPublishRef.current?.();
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
    await onAfterRemoveRef.current?.();
    router.push(redirectTo);
  }, [id, redirectTo, router, table]);

  return {
    data, setData, hasChanges,
    isSaving, isPublishing, isDeleting,
    save, publish, remove, guardNavigation,
  };
}
