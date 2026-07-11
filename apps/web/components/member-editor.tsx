"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FloatingActionPill } from "@/components/floating-action-pill";
import { Input } from "@/components/ui/input";
import { useT } from "@/lib/i18n/locale-provider";
import { createClient } from "@/lib/supabase/client";
import type { PublicProfile } from "@winlab/db";
import { Check, Loader2, Plus, Search } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

type Props = {
  eventId: string;
  memberIds: Set<string>;
  onMemberAdded: (profile: PublicProfile) => void;
  /** Render the trigger pill inline (for use inside FloatingActionStack). */
  inline?: boolean;
};

export function AddMemberButton({ eventId, memberIds, onMemberAdded, inline }: Props) {
  const t = useT();
  const supabaseRef = useRef(createClient());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [allUsers, setAllUsers] = useState<PublicProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState<string | null>(null);

  const fetchAllUsers = useCallback(async () => {
    setLoadingUsers(true);
    const { data } = await supabaseRef.current
      .from("public_profiles")
      .select("id, created_at, updated_at, display_name, avatar_url, has_profile_data")
      .order("display_name");
    setAllUsers((data as PublicProfile[]) ?? []);
    setLoadingUsers(false);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allUsers;
    return allUsers.filter((u) => (u.display_name ?? "").toLowerCase().includes(q));
  }, [allUsers, query]);

  async function addMember(profile: PublicProfile) {
    setAdding(profile.id);
    const { error } = await supabaseRef.current
      .from("event_participants")
      .insert({ event_id: eventId, user_id: profile.id });
    if (error) {
      toast.error(t.events.addMemberError);
    } else {
      onMemberAdded(profile);
      toast.success(t.events.memberAdded.replace("{name}", profile.display_name || t.common.user));
    }
    setAdding(null);
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <FloatingActionPill
          icon={Plus}
          label={t.events.addMember}
          inline={inline}
          onClick={() => {
            setQuery("");
            if (allUsers.length === 0) fetchAllUsers();
          }}
        />
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>{t.events.addMember}</DialogTitle>
        </DialogHeader>
        <div className="relative shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.events.searchUserPlaceholder}
            className="pl-9"
            autoFocus
          />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto -mx-6 px-6">
          {loadingUsers ? (
            <div className="flex justify-center py-8">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {query.trim() ? t.events.noMatchingUser : t.events.noUsers}
            </p>
          ) : (
            <div className="flex flex-col gap-0.5">
              {filtered.map((user) => {
                const isMember = memberIds.has(user.id);
                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => !isMember && addMember(user)}
                    disabled={isMember || adding === user.id}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors text-left disabled:opacity-60"
                  >
                    <Avatar size="sm">
                      {user.avatar_url && <AvatarImage src={user.avatar_url} alt={user.display_name ?? ""} />}
                      <AvatarFallback>{(user.display_name || "?").slice(0, 1)}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm flex-1">{user.display_name || t.common.unknownUser}</span>
                    {adding === user.id ? (
                      <Loader2 className="size-4 animate-spin text-muted-foreground" />
                    ) : isMember ? (
                      <Check className="size-4 text-muted-foreground" />
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
