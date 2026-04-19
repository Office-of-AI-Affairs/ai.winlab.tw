"use client";

import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

// See use-content-editor.ts for why the internal client is cast loose.
type TableName = keyof Database["public"]["Tables"];

type Options<T, N extends TableName> = {
  table: N;
  orderBy: string;
  ascending?: boolean;
  initialItems?: T[];
  onCreated?: (item: T) => void;
  onAfterMutation?: () => void | Promise<void>;
};

export function useCrudList<T extends { id: string }, N extends TableName = TableName>({
  table,
  orderBy,
  ascending = true,
  initialItems,
  onCreated,
  onAfterMutation,
}: Options<T, N>) {
  const supabaseRef = useRef(createClient() as unknown as SupabaseClient);
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
      const { data } = await supabaseRef.current.from(table).select("*").order(orderBy, { ascending });
      setItems((data as T[] | null) ?? []);
      setIsLoading(false);
    }
    fetch();
  }, [ascending, initialItems, orderBy, table]);

  const create = useCallback(
    async (defaults: Record<string, unknown> = {}): Promise<T | null> => {
      setIsCreating(true);
      const { data, error } = await supabaseRef.current
        .from(table)
        .insert(defaults)
        .select()
        .single();
      setIsCreating(false);
      if (error) {
        toast.error("建立失敗");
        return null;
      }
      const item = data as T;
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
      const { error } = await supabaseRef.current.from(table).delete().eq("id", id);
      setDeletingId(null);
      if (error) {
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
      const updates = reorderedItems.map((item, index) =>
        supabaseRef.current
          .from(table)
          .update({ sort_order: index })
          .eq("id", item.id),
      );
      const results = await Promise.all(updates);
      if (results.some((r) => r.error)) {
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
