"use client";

import { createClient } from "@/lib/supabase/client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type Options<T extends Record<string, unknown>> = {
  table: string;
  editingId: string | null;
  getDefaults: () => T;
  buildPayload: (form: T) => Record<string, unknown>;
  validate?: (form: T) => string | null;
  onClose: () => void;
  onAfterSave?: () => void | Promise<void>;
  onAfterRemove?: () => void | Promise<void>;
};

export function useDialogForm<T extends Record<string, unknown>>({
  table,
  editingId,
  getDefaults,
  buildPayload,
  validate,
  onClose,
  onAfterSave,
  onAfterRemove,
}: Options<T>) {
  const router = useRouter();
  const supabaseRef = useRef(createClient());
  const getDefaultsRef = useRef(getDefaults);
  const buildPayloadRef = useRef(buildPayload);
  const validateRef = useRef(validate);
  const onCloseRef = useRef(onClose);
  const onAfterSaveRef = useRef(onAfterSave);
  const onAfterRemoveRef = useRef(onAfterRemove);

  useEffect(() => { getDefaultsRef.current = getDefaults; }, [getDefaults]);
  useEffect(() => { buildPayloadRef.current = buildPayload; }, [buildPayload]);
  useEffect(() => { validateRef.current = validate; }, [validate]);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  useEffect(() => { onAfterSaveRef.current = onAfterSave; }, [onAfterSave]);
  useEffect(() => { onAfterRemoveRef.current = onAfterRemove; }, [onAfterRemove]);

  const [formData, setFormData] = useState<T>(getDefaults);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const updateField = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resetForm = useCallback((data?: T) => {
    setFormData(data ?? getDefaultsRef.current());
  }, []);

  const save = useCallback(async () => {
    if (validateRef.current) {
      const err = validateRef.current(formData);
      if (err) { toast.error(err); return; }
    }
    setIsSaving(true);
    const payload = buildPayloadRef.current(formData);

    let error;
    if (editingId) {
      ({ error } = await supabaseRef.current.from(table).update(payload).eq("id", editingId));
    } else {
      ({ error } = await supabaseRef.current.from(table).insert(payload));
    }

    setIsSaving(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(editingId ? "已更新" : "已建立");
      onCloseRef.current();
      await onAfterSaveRef.current?.();
      router.refresh();
    }
  }, [editingId, formData, router, table]);

  const remove = useCallback(async () => {
    if (!editingId) return;
    setIsDeleting(true);
    const { error } = await supabaseRef.current.from(table).delete().eq("id", editingId);
    setIsDeleting(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("已刪除");
      onCloseRef.current();
      await onAfterRemoveRef.current?.();
      router.refresh();
    }
  }, [editingId, router, table]);

  return { formData, setFormData, updateField, resetForm, isSaving, isDeleting, save, remove };
}
