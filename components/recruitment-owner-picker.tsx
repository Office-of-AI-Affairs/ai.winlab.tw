"use client";

import { Loader2, Plus, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";

type UserOption = {
  id: string;
  email: string;
  display_name: string | null;
};

type OwnerRow = {
  user_id: string;
  email: string;
  display_name: string | null;
};

type Props = {
  competitionId: string;
};

/**
 * Admin-only UI for managing the owner list of a single recruitment. Owners
 * gain edit + applicant-view rights on that recruitment (competition_owners
 * RLS enforces admin-only writes, so non-admin viewers can't open this path).
 */
export function RecruitmentOwnerPicker({ competitionId }: Props) {
  const supabaseRef = useRef(createClient());
  const [owners, setOwners] = useState<OwnerRow[] | null>(null);
  const [allUsers, setAllUsers] = useState<UserOption[]>([]);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  const refreshOwners = useCallback(async () => {
    const { data, error } = await supabaseRef.current
      .from("competition_owners")
      .select("user_id")
      .eq("competition_id", competitionId);
    if (error) {
      console.error("load owners failed:", error);
      toast.error("載入擁有者失敗");
      return;
    }
    const userIds = ((data as { user_id: string }[] | null) ?? []).map((r) => r.user_id);
    if (userIds.length === 0) { setOwners([]); return; }
    const { data: userRows, error: userErr } = await supabaseRef.current
      .rpc("get_all_users");
    if (userErr) {
      console.error("load users (for owners) failed:", userErr);
      toast.error("載入使用者資料失敗");
      return;
    }
    const userById = new Map(((userRows as UserOption[] | null) ?? []).map((u) => [u.id, u]));
    const rows: OwnerRow[] = userIds.map((uid) => {
      const u = userById.get(uid);
      return {
        user_id: uid,
        email: u?.email ?? "(未知)",
        display_name: u?.display_name ?? null,
      };
    });
    setOwners(rows);
  }, [competitionId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await refreshOwners();
      if (cancelled) return;
      const { data, error } = await supabaseRef.current.rpc("get_all_users");
      if (error) { console.error("load users failed:", error); return; }
      if (!cancelled) setAllUsers((data as UserOption[] | null) ?? []);
    })();
    return () => { cancelled = true; };
  }, [refreshOwners]);

  async function addOwner(userId: string) {
    setBusyUserId(userId);
    const { error } = await supabaseRef.current
      .from("competition_owners")
      .insert({ competition_id: competitionId, user_id: userId });
    setBusyUserId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    setPopoverOpen(false);
    await refreshOwners();
  }

  async function removeOwner(userId: string) {
    setBusyUserId(userId);
    const { error } = await supabaseRef.current
      .from("competition_owners")
      .delete()
      .eq("competition_id", competitionId)
      .eq("user_id", userId);
    setBusyUserId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    await refreshOwners();
  }

  const ownerIds = new Set((owners ?? []).map((o) => o.user_id));
  const candidates = allUsers.filter((u) => !ownerIds.has(u.id));

  return (
    <div className="space-y-3">
      {owners === null ? (
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-md" />
          ))}
        </div>
      ) : owners.length === 0 ? (
        <p className="text-sm text-muted-foreground">尚無擁有者（只有 admin 能編輯此徵才）</p>
      ) : (
        <ul className="space-y-2">
          {owners.map((o) => (
            <li
              key={o.user_id}
              className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {o.display_name || o.email}
                </p>
                {o.display_name && (
                  <p className="truncate text-xs text-muted-foreground">{o.email}</p>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`移除擁有者 ${o.email}`}
                disabled={busyUserId === o.user_id}
                onClick={() => removeOwner(o.user_id)}
              >
                {busyUserId === o.user_id ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />}
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" size="sm">
            <Plus className="size-4 mr-1" />
            新增擁有者
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[360px] p-0" align="start">
          <Command>
            <CommandInput placeholder="搜尋 email 或姓名…" />
            <CommandList>
              <CommandEmpty>找不到使用者</CommandEmpty>
              <CommandGroup>
                {candidates.map((u) => (
                  <CommandItem
                    key={u.id}
                    value={`${u.email} ${u.display_name ?? ""}`}
                    onSelect={() => addOwner(u.id)}
                    disabled={busyUserId === u.id}
                    className="flex flex-col items-start gap-0.5"
                  >
                    <span className="text-sm font-medium">
                      {u.display_name || u.email}
                    </span>
                    {u.display_name && (
                      <span className="text-xs text-muted-foreground">{u.email}</span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
