"use client";

import { Loader2, Plus, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
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
import { useT } from "@/lib/i18n/locale-provider";
import {
  addRecruitmentOwner,
  listOwnerCandidates,
  listRecruitmentOwners,
  removeRecruitmentOwner,
  type OwnerRow,
  type UserOption,
} from "@/lib/actions/recruitment";

type Props = {
  competitionId: string;
};

/**
 * Admin-only UI for managing the owner list of a single recruitment. Owners
 * gain edit + applicant-view rights on that recruitment (competition_owners
 * RLS enforces admin-only writes, so non-admin viewers can't open this path).
 */
export function RecruitmentOwnerPicker({ competitionId }: Props) {
  const t = useT();
  const [owners, setOwners] = useState<OwnerRow[] | null>(null);
  const [allUsers, setAllUsers] = useState<UserOption[]>([]);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  const refreshOwners = useCallback(async () => {
    try {
      setOwners(await listRecruitmentOwners(competitionId));
    } catch (error) {
      console.error("load owners failed:", error);
      toast.error(t.recruitment.owner.loadOwnersError);
    }
  }, [competitionId, t]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await refreshOwners();
      if (cancelled) return;
      const users = await listOwnerCandidates().catch(() => null);
      if (!users) {
        toast.error(t.recruitment.owner.loadUsersError);
        return;
      }
      if (!cancelled) setAllUsers(users);
    })();
    return () => { cancelled = true; };
  }, [refreshOwners, t]);

  async function addOwner(userId: string) {
    setBusyUserId(userId);
    const result = await addRecruitmentOwner(competitionId, userId).catch(() => null);
    setBusyUserId(null);
    if (!result?.ok) {
      toast.error(result?.error ?? t.common.actionFailedRetry);
      return;
    }
    setPopoverOpen(false);
    await refreshOwners();
  }

  async function removeOwner(userId: string) {
    setBusyUserId(userId);
    const result = await removeRecruitmentOwner(competitionId, userId).catch(() => null);
    setBusyUserId(null);
    if (!result?.ok) {
      toast.error(result?.error ?? t.common.actionFailedRetry);
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
        <p className="text-sm text-muted-foreground">{t.recruitment.owner.empty}</p>
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
                aria-label={t.recruitment.owner.removeAria.replace("{email}", o.email)}
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
            {t.recruitment.owner.add}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[360px] p-0" align="start">
          <Command>
            <CommandInput placeholder={t.recruitment.owner.searchPlaceholder} />
            <CommandList>
              <CommandEmpty>{t.recruitment.owner.noUsers}</CommandEmpty>
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
