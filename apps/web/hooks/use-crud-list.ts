"use client";

import { deleteRow, insertRow, listRows, reorderRows } from "@/lib/actions/rows";
import type { RowTable } from "@/lib/permissions/rows";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type Options<T> = {
  table: RowTable;
  orderBy: string;
  ascending?: boolean;
  initialItems?: T[];
  onCreated?: (item: T) => void;
  onAfterMutation?: () => void | Promise<void>;
};

export function useCrudList<T extends { id: string }>({
  table,
  orderBy,
  ascending = true,
  initialItems,
  onCreated,
  onAfterMutation,
}: Options<T>) {
  const onCreatedRef = useRef(onCreated);
  const onAfterMutationRef = useRef(onAfterMutation);
  useEffect(() => { onCreatedRef.current = onCreated; }, [onCreated]);
  useEffect(() => { onAfterMutationRef.current = onAfterMutation; }, [onAfterMutation]);

  const [items, setItems] = useState<T[]>(initialItems ?? []);
  const [isLoading, setIsLoading] = useState(!initialItems);
  const [isCreating, setIsCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (initialItems) return;
    async function fetch() {
      const rows = await listRows(table, {}, [{ column: orderBy, ascending }]);
      setItems(rows as unknown as T[]);
      setIsLoading(false);
    }
    fetch();
  }, [ascending, initialItems, orderBy, table]);

  const create = useCallback(
    async (defaults: Record<string, unknown> = {}): Promise<T | null> => {
      setIsCreating(true);
      const result = await insertRow(table, defaults).catch(() => null);
      setIsCreating(false);
      if (!result?.ok) {
        toast.error("建立失敗");
        return null;
      }
      const item = result.row as unknown as T;
      onCreatedRef.current?.(item);
      await onAfterMutationRef.current?.();
      return item;
    },
    [table],
  );

  const remove = useCallback(
    async (id: string) => {
      if (!confirm("確定要刪除嗎？")) return;
      setDeletingId(id);
      const result = await deleteRow(table, id).catch(() => null);
      setDeletingId(null);
      if (!result?.ok) {
        toast.error("刪除失敗");
        return;
      }
      setItems((prev) => prev.filter((item) => item.id !== id));
      await onAfterMutationRef.current?.();
    },
    [table],
  );

  const reorder = useCallback(
    async (reorderedItems: T[]) => {
      const prev = items;
      setItems(reorderedItems);
      const result = await reorderRows(table, reorderedItems.map((item) => item.id)).catch(() => null);
      if (!result?.ok) {
        toast.error("排序更新失敗");
        setItems(prev);
        return;
      }
      await onAfterMutationRef.current?.();
    },
    [table, items],
  );

  return { items, setItems, isLoading, isCreating, deletingId, create, remove, reorder };
}
