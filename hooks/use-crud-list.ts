"use client";

import { createClient } from "@/lib/supabase/client";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type Options<T> = {
  table: string;
  orderBy: string;
  ascending?: boolean;
  initialItems?: T[];
  onCreated?: (item: T) => void;
};

export function useCrudList<T extends { id: string }>({
  table,
  orderBy,
  ascending = true,
  initialItems,
  onCreated,
}: Options<T>) {
  const supabaseRef = useRef(createClient());
  const onCreatedRef = useRef(onCreated);
  useEffect(() => { onCreatedRef.current = onCreated; }, [onCreated]);

  const [items, setItems] = useState<T[]>(initialItems ?? []);
  const [isLoading, setIsLoading] = useState(!initialItems);
  const [isCreating, setIsCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (initialItems) return;
    async function fetch() {
      const { data } = await supabaseRef.current.from(table).select("*").order(orderBy, { ascending });
      setItems((data as T[]) ?? []);
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
    },
    [table],
  );

  return { items, isLoading, isCreating, deletingId, create, remove };
}
