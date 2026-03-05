"use client";

import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import type { Profile, Team, TeamMember } from "@/lib/supabase/types";
import { ArrowLeft, Loader2, Trash2, UserMinus } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type TeamMemberWithProfile = TeamMember & { profile?: Profile | null };

export default function TeamDetailPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const supabase = createClient();

  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMemberWithProfile[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const isLeader = team?.leader_id === user?.id;

  const fetchTeam = useCallback(async () => {
    const { data, error } = await supabase
      .from("teams")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      console.error("Error fetching team:", error);
      router.push("/account/teams");
      return;
    }
    setTeam(data as Team);
  }, [supabase, id, router]);

  const fetchMembers = useCallback(async () => {
    const { data: membersData, error } = await supabase
      .from("team_members")
      .select("*")
      .eq("team_id", id);

    if (error) {
      console.error("Error fetching members:", error);
      return;
    }

    const m = (membersData as TeamMember[]) || [];
    const userIds = [...new Set(m.map((x) => x.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", userIds);

    const profileMap = new Map(
      (profiles || []).map((p) => [p.id, p as Profile])
    );
    setMembers(
      m.map((mem) => ({
        ...mem,
        profile: profileMap.get(mem.user_id) ?? null,
      }))
    );
  }, [supabase, id]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }
    if (user) {
      (async () => {
        await fetchTeam();
        await fetchMembers();
        setIsLoading(false);
      })();
    }
  }, [authLoading, user, router, fetchTeam, fetchMembers]);

  const handleSaveTeam = async () => {
    if (!team || !isLeader) return;
    setIsSaving(true);
    await supabase
      .from("teams")
      .update({ name: team.name, description: team.description || null })
      .eq("id", id);
    setIsSaving(false);
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !isLeader) return;
    setIsInviting(true);
    await supabase.from("team_invitations").insert({
      team_id: id,
      email: inviteEmail.trim(),
      invited_by: user!.id,
      status: "pending",
    });
    setInviteEmail("");
    setIsInviting(false);
  };

  const handleRemoveMember = async (userId: string) => {
    if (!isLeader || userId === user?.id) return;
    if (!confirm("確定要移除此成員嗎？")) return;
    await supabase.from("team_members").delete().eq("team_id", id).eq("user_id", userId);
    fetchMembers();
  };

  const handleLeave = async () => {
    if (!user || isLeader) return;
    if (!confirm("確定要離開此隊伍嗎？")) return;
    setIsLeaving(true);
    await supabase.from("team_members").delete().eq("team_id", id).eq("user_id", user.id);
    setIsLeaving(false);
    router.push("/account/teams");
  };

  const handleDeleteTeam = async () => {
    if (!isLeader) return;
    if (!confirm("確定要刪除此隊伍嗎？此操作無法復原。")) return;
    setIsDeleting(true);
    await supabase.from("teams").delete().eq("id", id);
    setIsDeleting(false);
    router.push("/account/teams");
  };

  if (authLoading || !user) {
    return (
      <div className="container max-w-2xl mx-auto p-4 flex justify-center items-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isLoading || !team) {
    return (
      <div className="container max-w-2xl mx-auto p-4 flex justify-center items-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isMember = members.some((m) => m.user_id === user.id);
  if (!isMember) {
    router.push("/account/teams");
    return null;
  }

  return (
    <div className="container max-w-2xl mx-auto p-4 flex flex-col gap-8 mt-8">
      <div className="flex items-center gap-4">
        <Link href="/account/teams">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4" />
            返回隊伍列表
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>隊伍資訊</CardTitle>
          <CardDescription>隊伍名稱與簡介</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {isLeader ? (
            <>
              <div className="grid gap-2">
                <Label>隊伍名稱</Label>
                <Input
                  value={team.name}
                  onChange={(e) => setTeam({ ...team, name: e.target.value })}
                  placeholder="隊伍名稱"
                />
              </div>
              <div className="grid gap-2">
                <Label>簡介（選填）</Label>
                <Textarea
                  className="min-h-[80px] resize-y"
                  value={team.description ?? ""}
                  onChange={(e) =>
                    setTeam({ ...team, description: e.target.value || null })
                  }
                  placeholder="隊伍簡介"
                />
              </div>
              <Button onClick={handleSaveTeam} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : null}
                儲存
              </Button>
            </>
          ) : (
            <>
              <p className="font-medium">{team.name}</p>
              {team.description && (
                <p className="text-sm text-muted-foreground">
                  {team.description}
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>成員</CardTitle>
          <CardDescription>隊伍成員列表</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ul className="flex flex-col gap-2">
            {members.map((m) => (
              <li
                key={m.user_id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <span>
                  {m.profile?.display_name || m.user_id.slice(0, 8)}
                  {m.role === "leader" && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      （組長）
                    </span>
                  )}
                </span>
                {isLeader && m.role !== "leader" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveMember(m.user_id)}
                  >
                    <UserMinus className="w-4 h-4" />
                    移除
                  </Button>
                )}
              </li>
            ))}
          </ul>

          {isLeader && (
            <div className="flex flex-col gap-2 pt-4 border-t">
              <Label>邀請新成員（輸入對方信箱）</Label>
              <div className="flex gap-2">
                <Input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="email@example.com"
                />
                <Button onClick={handleInvite} disabled={isInviting || !inviteEmail.trim()}>
                  {isInviting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : null}
                  邀請
                </Button>
              </div>
            </div>
          )}

          {!isLeader && (
            <Button
              variant="destructive"
              className="w-fit"
              onClick={handleLeave}
              disabled={isLeaving}
            >
              {isLeaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : null}
              離開隊伍
            </Button>
          )}
        </CardContent>
      </Card>

      {isLeader && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">危險區域</CardTitle>
            <CardDescription>刪除隊伍後無法復原</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="destructive"
              onClick={handleDeleteTeam}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              刪除隊伍
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
