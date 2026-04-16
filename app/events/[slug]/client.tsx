"use client";

import { AppLink } from "@/components/app-link";
import { MemberEditor } from "@/components/member-editor";
import { RecruitmentCard } from "@/components/recruitment-card";
import { RecruitmentDialog } from "@/components/recruitment-dialog";
import { ResultCard, type ResultWithMeta } from "@/components/result-card";
import { PageShell } from "@/components/page-shell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useEventActions } from "@/hooks/use-event-actions";
import { formatDate } from "@/lib/date";
import type { Announcement, Event, Recruitment } from "@/lib/supabase/types";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Loader2, Pencil, Plus, Search } from "lucide-react";
import Link from "next/link";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { useMemo, useState } from "react";

type Tab = "announcements" | "results" | "recruitment" | "members";

const BASE_TABS: { value: Tab; label: string }[] = [
  { value: "announcements", label: "公告" },
  { value: "results", label: "成果" },
  { value: "recruitment", label: "徵才" },
];

const MEMBERS_TAB: { value: Tab; label: string } = { value: "members", label: "學員名單" };

const tabParser = parseAsStringLiteral(["announcements", "results", "recruitment", "members"] as const).withDefault("results");

export function EventDetailClient({
  event,
  slug,
  isAdmin,
  isEventVendor,
  userId,
  announcements,
  results,
  recruitments,
  members,
}: {
  event: Event;
  slug: string;
  isAdmin: boolean;
  isEventVendor: boolean;
  userId: string | null;
  announcements: Announcement[];
  results: ResultWithMeta[];
  recruitments: Recruitment[];
  members: { id: string; display_name: string | null; avatar_url: string | null; hasProfileData: boolean }[];
}) {
  const [tab, setTab] = useQueryState("tab", tabParser);
  const { isCreating, createAnnouncement, togglePin } = useEventActions(event.id, slug, userId);

  const [currentMembers, setCurrentMembers] = useState(members);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingRecruitment, setEditingRecruitment] = useState<Recruitment | null>(null);
  const [memberSearch, setMemberSearch] = useState("");

  const openCreateSheet = () => { setEditingRecruitment(null); setSheetOpen(true); };
  const openEditSheet = (r: Recruitment) => { setEditingRecruitment(r); setSheetOpen(true); };

  const visibleTabs = useMemo(
    () => userId ? [...BASE_TABS, MEMBERS_TAB] : BASE_TABS,
    [userId],
  );

  return (
    <PageShell>
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        回首頁
      </Link>

      <div className="flex flex-col gap-4">

        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{event.name}</h1>
              {event.status === "draft" && (
                <span className="rounded-full bg-yellow-100 text-yellow-800 px-3 py-0.5 text-sm font-medium">草稿</span>
              )}
            </div>
            {event.description && (
              <p className="text-muted-foreground">{event.description}</p>
            )}
          </div>
          {isAdmin && (
            <Link
              href={`/events/${slug}/edit`}
              className="inline-flex items-center gap-2 text-sm rounded-lg px-3 py-2 border border-border hover:bg-muted transition-colors shrink-0"
            >
              <Pencil className="w-4 h-4" />
              編輯活動
            </Link>
          )}
        </div>
      </div>

      <div className="flex gap-2 border-b border-border pb-2">
        {visibleTabs.map(({ value, label }) => (
          <Button
            key={value}
            variant={tab === value ? "default" : "ghost"}
            size="sm"
            onClick={() => setTab(value)}
          >
            {label}
          </Button>
        ))}
      </div>

      {tab === "announcements" && (
        <div className="flex flex-col gap-6">
          {isAdmin && (
            <div className="flex justify-end">
              <Button variant="secondary" onClick={createAnnouncement} disabled={isCreating}>
                {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                新增公告
              </Button>
            </div>
          )}
          {announcements.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">尚無公告</div>
          ) : (
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted h-12">
                    <th className="text-base font-bold text-left pl-5 pr-4 py-3 w-32">公告日期</th>
                    <th className="text-base font-bold text-left px-4 py-3 w-28">類別</th>
                    <th className="text-base font-bold text-left px-4 py-3">標題</th>
                    {isAdmin && <th className="text-base font-bold text-left px-4 py-3 w-20">狀態</th>}
                  </tr>
                </thead>
                <tbody>
                  {announcements.map((item) => (
                    <tr key={item.id} className="h-12 border-t border-border hover:bg-muted/60 transition-colors">
                      <td colSpan={isAdmin ? 4 : 3} className="p-0">
                        <Link
                          href={isAdmin ? `/events/${slug}/announcements/${item.id}/edit` : `/events/${slug}/announcements/${item.id}`}
                          className="flex items-center w-full h-full"
                        >
                          <span className="pl-5 pr-4 py-3 w-32 text-base shrink-0">{formatDate(item.date)}</span>
                          <span className="px-4 py-3 w-28 text-base shrink-0">{item.category}</span>
                          <span className="px-4 py-3 text-base flex-1">{item.title || "(無標題)"}</span>
                          {isAdmin && (
                            <span className="px-4 py-3 w-20 text-base shrink-0">
                              <Badge variant={item.status === "published" ? "default" : "secondary"}>
                                {item.status === "published" ? "已發布" : "草稿"}
                              </Badge>
                            </span>
                          )}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "results" && (
        <div className="flex flex-col gap-6">
          {results.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">尚無成果</div>
          ) : (
            <div className="grid lg:grid-cols-3 md:grid-cols-2 grid-cols-1 gap-6">
              {results.map((item) => {
                const isOwner = userId === item.author_id;
                const showStatus = isAdmin || isOwner;
                return (
                  <ResultCard
                    key={item.id}
                    item={item}
                    href={isAdmin ? `/events/${slug}/results/${item.id}/edit` : `/events/${slug}/results/${item.id}`}
                    publisherHref={item.type === "personal" && item.author_id ? `/profile/${item.author_id}` : null}
                    showStatus={showStatus}
                    isAdmin={isAdmin}
                    onPinToggle={isAdmin ? (id, pinned) => togglePin("results", id, pinned) : undefined}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === "recruitment" && (
        <div className="flex flex-col gap-6">
          {(isAdmin || isEventVendor) && (
            <div className="flex justify-end">
              <Button variant="secondary" onClick={openCreateSheet}>
                <Plus className="w-4 h-4" />
                新增徵才
              </Button>
            </div>
          )}
          {recruitments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">尚無徵才資訊</div>
          ) : (
            <div className="grid lg:grid-cols-3 md:grid-cols-2 grid-cols-1 gap-6">
              {recruitments.map((item) => (
                <RecruitmentCard
                  key={item.id}
                  item={item}
                  href={`/events/${slug}/recruitment/${item.id}`}
                  isAdmin={isAdmin}
                  onPinToggle={isAdmin ? (id, pinned) => togglePin("competitions", id, pinned) : undefined}
                  onEdit={(isAdmin || (isEventVendor && item.created_by === userId)) ? () => openEditSheet(item) : undefined}
                />
              ))}
            </div>
          )}
          <RecruitmentDialog open={sheetOpen} onOpenChange={setSheetOpen} recruitment={editingRecruitment} eventId={event.id} />
        </div>
      )}

      {tab === "members" && userId && (
        <div className="flex flex-col gap-6">
          {isAdmin ? (
            <MemberEditor eventId={event.id} members={currentMembers} onMembersChange={setCurrentMembers} />
          ) : (
            currentMembers.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">尚無成員</div>
            ) : (
              <>
                <div className="relative max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="搜尋學員⋯"
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="flex flex-col gap-3">
                  {currentMembers
                    .filter((m) => !memberSearch || (m.display_name ?? "").toLowerCase().includes(memberSearch.toLowerCase()))
                    .map((member) => (
                    <AppLink
                      key={member.id}
                      href={`/profile/${member.id}`}
                      className="flex items-center gap-3 rounded-lg px-4 py-3 hover:bg-muted transition-colors"
                    >
                      <Avatar size="sm">
                        {member.avatar_url && <AvatarImage src={member.avatar_url} alt={member.display_name ?? ""} />}
                        <AvatarFallback>
                          {(member.display_name ?? "?")[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">
                        {member.display_name ?? "未知使用者"}
                      </span>
                      {!member.hasProfileData && (
                        <Badge variant="secondary">尚無資料</Badge>
                      )}
                    </AppLink>
                  ))}
                </div>
              </>
            )
          )}
        </div>
      )}
    </PageShell>
  );
}
