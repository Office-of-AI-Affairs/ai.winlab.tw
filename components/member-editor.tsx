"use client";

import { AppLink } from "@/components/app-link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import type { PublicProfile } from "@/lib/supabase/types";
import { Check, Loader2, Plus, Search, X } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

type Member = { id: string; display_name: string | null; hasProfileData: boolean };

type Props = {
  eventId: string;
  members: Member[];
  onMembersChange: (members: Member[]) => void;
};

export function MemberEditor({ eventId, members, onMembersChange }: Props) {
  const supabaseRef = useRef(createClient());
  const [removing, setRemoving] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [allUsers, setAllUsers] = useState<PublicProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState<string | null>(null);

  const memberIds = useMemo(() => new Set(members.map((m) => m.id)), [members]);

  const fetchAllUsers = useCallback(async () => {
    setLoadingUsers(true);
    const { data } = await supabaseRef.current
      .from("public_profiles")
      .select("id, created_at, updated_at, display_name")
      .order("display_name");
    setAllUsers((data as PublicProfile[]) ?? []);
    setLoadingUsers(false);
  }, []);

  const filtered = query.trim()
    ? allUsers.filter((u) =>
        (u.display_name ?? "").toLowerCase().includes(query.trim().toLowerCase())
      )
    : allUsers;

  async function addMember(profile: PublicProfile) {
    setAdding(profile.id);
    const { error } = await supabaseRef.current
      .from("event_participants")
      .insert({ event_id: eventId, user_id: profile.id });
    if (error) {
      toast.error("無法新增成員");
    } else {
      onMembersChange([...members, { id: profile.id, display_name: profile.display_name, hasProfileData: false }]);
      toast.success(`已新增 ${profile.display_name || "使用者"}`);
    }
    setAdding(null);
  }

  async function removeMember(userId: string) {
    setRemoving(userId);
    const { error } = await supabaseRef.current
      .from("event_participants")
      .delete()
      .eq("event_id", eventId)
      .eq("user_id", userId);
    if (error) {
      toast.error("無法移除成員");
    } else {
      onMembersChange(members.filter((m) => m.id !== userId));
      toast.success("已移除成員");
    }
    setRemoving(null);
  }

  const [listFilter, setListFilter] = useState("");

  const filteredMembers = listFilter.trim()
    ? members.filter((m) => (m.display_name ?? "").toLowerCase().includes(listFilter.trim().toLowerCase()))
    : members;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="搜尋學員⋯"
            value={listFilter}
            onChange={(e) => setListFilter(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="secondary" onClick={() => { setQuery(""); setDialogOpen(true); if (allUsers.length === 0) fetchAllUsers(); }}>
          <Plus className="w-4 h-4" />
          新增成員
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[80vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>新增成員</DialogTitle>
          </DialogHeader>
          <div className="relative shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜尋使用者名稱…"
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
                {query.trim() ? "找不到符合的使用者" : "尚無使用者"}
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
                        <AvatarFallback>
                          {(user.display_name || "?").slice(0, 1)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm flex-1">
                        {user.display_name || "未知使用者"}
                      </span>
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

      {filteredMembers.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {listFilter.trim() ? "找不到符合的學員" : "尚無成員"}
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {filteredMembers.map((member) => (
            <div
              key={member.id}
              className="flex items-center gap-3 rounded-lg px-4 py-3 hover:bg-muted transition-colors"
            >
              <Avatar size="sm">
                <AvatarFallback>
                  {(member.display_name ?? "?")[0]}
                </AvatarFallback>
              </Avatar>
              <AppLink
                href={`/profile/${member.id}`}
                className="text-sm font-medium hover:underline"
              >
                {member.display_name ?? "未知使用者"}
              </AppLink>
              {!member.hasProfileData && (
                <Badge variant="secondary">尚無資料</Badge>
              )}
              <div className="flex-1" />
              <button
                type="button"
                onClick={() => removeMember(member.id)}
                disabled={removing === member.id}
                className="text-muted-foreground hover:text-destructive transition-colors"
              >
                {removing === member.id ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <X className="size-3.5" />
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
