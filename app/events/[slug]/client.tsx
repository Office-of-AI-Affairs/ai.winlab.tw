"use client";

import { AppLink } from "@/components/app-link";
import { useAuth } from "@/components/auth-provider";
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
import { createClient } from "@/lib/supabase/client";
import { composeRecruitment } from "@/lib/recruitment-records";
import type {
  Announcement,
  Event,
  Recruitment,
  RecruitmentPrivateDetails,
  Result,
} from "@/lib/supabase/types";
import type { EventMember } from "./data";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Loader2, Pencil, Plus, Search } from "lucide-react";
import Link from "next/link";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { useEffect, useMemo, useRef, useState } from "react";

type Tab = "announcements" | "results" | "recruitment" | "members";

const BASE_TABS: { value: Tab; label: string }[] = [
  { value: "announcements", label: "公告" },
  { value: "results", label: "成果" },
  { value: "recruitment", label: "徵才" },
];

const MEMBERS_TAB: { value: Tab; label: string } = { value: "members", label: "學員名單" };

const tabParser = parseAsStringLiteral(["announcements", "results", "recruitment", "members"] as const).withDefault("results");

function sortAnnouncements(list: Announcement[]): Announcement[] {
  return [...list].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

function sortResults<T extends { pinned: boolean; created_at: string }>(list: T[]): T[] {
  return [...list].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return a.created_at < b.created_at ? -1 : 1;
  });
}

export function EventDetailClient({
  event,
  slug,
  publishedAnnouncements,
  publishedResults,
  publishedRecruitments,
  initialMembers,
}: {
  event: Event;
  slug: string;
  publishedAnnouncements: Announcement[];
  publishedResults: ResultWithMeta[];
  publishedRecruitments: Recruitment[];
  initialMembers: EventMember[];
}) {
  const { user, isAdmin } = useAuth();
  const userId = user?.id ?? null;
  const supabaseRef = useRef(createClient());
  const [tab, setTab] = useQueryState("tab", tabParser);
  const { isCreating, createAnnouncement, togglePin } = useEventActions(event.id, slug, userId);

  const [currentMembers, setCurrentMembers] = useState(initialMembers);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingRecruitment, setEditingRecruitment] = useState<Recruitment | null>(null);
  const [memberSearch, setMemberSearch] = useState("");

  const [draftAnnouncements, setDraftAnnouncements] = useState<Announcement[]>([]);
  const [draftResults, setDraftResults] = useState<ResultWithMeta[]>([]);
  // privateFetch holds whatever the last fetch returned. The visibility
  // gate (admin or current owner) is applied in the derived `privateDetails`
  // memo below, so a stale fetch can never leak past a permission change.
  const [privateFetch, setPrivateFetch] = useState<Map<string, RecruitmentPrivateDetails> | null>(null);
  const [ownedRecruitmentIds, setOwnedRecruitmentIds] = useState<Set<string>>(new Set());

  // Admin / owner drafts for announcements. RLS filters: admin sees all,
  // author sees their own. No reset on !userId — useMemo guards on draft
  // length so signed-out viewers see published-only without a state poke.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      const query = supabaseRef.current
        .from("announcements")
        .select("*")
        .eq("event_id", event.id)
        .eq("status", "draft");
      if (!isAdmin) query.eq("author_id", userId);
      const { data } = await query.order("date", { ascending: false });
      if (!cancelled) setDraftAnnouncements((data as Announcement[] | null) ?? []);
    })();
    return () => { cancelled = true; };
  }, [event.id, isAdmin, userId]);

  // Admin / owner drafts for results. Same stale-state argument as the
  // announcement draft effect above.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      const query = supabaseRef.current
        .from("results")
        .select("*")
        .eq("event_id", event.id)
        .eq("status", "draft");
      if (!isAdmin) query.eq("author_id", userId);
      const { data: rawDrafts } = await query;
      const drafts = (rawDrafts as Result[] | null) ?? [];
      if (drafts.length === 0) { if (!cancelled) setDraftResults([]); return; }

      const authorIds = [...new Set(drafts.map((r) => r.author_id).filter(Boolean))] as string[];
      const teamIds = [...new Set(drafts.map((r) => r.team_id).filter(Boolean))] as string[];
      const [{ data: authors }, { data: teams }, { data: coauthorRows }] = await Promise.all([
        authorIds.length
          ? supabaseRef.current.from("public_profiles").select("id, display_name").in("id", authorIds)
          : Promise.resolve({ data: [] as { id: string; display_name: string | null }[] }),
        teamIds.length
          ? supabaseRef.current.from("public_teams").select("id, name").in("id", teamIds)
          : Promise.resolve({ data: [] as { id: string; name: string }[] }),
        supabaseRef.current
          .from("result_coauthors")
          .select("result_id, user_id")
          .in("result_id", drafts.map((r) => r.id)),
      ]);
      const profileMap = Object.fromEntries(
        ((authors as { id: string; display_name: string | null }[] | null) ?? []).map((p) => [p.id, p.display_name]),
      );
      const teamMap = Object.fromEntries(
        ((teams as { id: string; name: string }[] | null) ?? []).map((t) => [t.id, t.name]),
      );
      const coauthorsByResult = new Map<string, { id: string; name: string }[]>();
      const coauthorUserIds = [...new Set(((coauthorRows as { user_id: string }[] | null) ?? []).map((r) => r.user_id))];
      if (coauthorUserIds.length) {
        const { data: coProfiles } = await supabaseRef.current
          .from("public_profiles")
          .select("id, display_name")
          .in("id", coauthorUserIds);
        for (const p of ((coProfiles as { id: string; display_name: string | null }[] | null) ?? [])) {
          if (!profileMap[p.id]) profileMap[p.id] = p.display_name;
        }
      }
      for (const row of (coauthorRows as { result_id: string; user_id: string }[] | null) ?? []) {
        const list = coauthorsByResult.get(row.result_id) ?? [];
        list.push({ id: row.user_id, name: profileMap[row.user_id] ?? "未知使用者" });
        coauthorsByResult.set(row.result_id, list);
      }
      const composed: ResultWithMeta[] = drafts.map((r) => ({
        ...r,
        author_name: r.author_id ? profileMap[r.author_id] ?? null : null,
        team_name: r.team_id ? teamMap[r.team_id] ?? null : null,
        coauthors: coauthorsByResult.get(r.id) ?? [],
      }));
      if (!cancelled) setDraftResults(composed);
    })();
    return () => { cancelled = true; };
  }, [event.id, isAdmin, userId]);

  // Per-recruitment ownership for non-admins (powers the inline edit gate).
  // Admins skip this fetch entirely; the empty initial Set covers them.
  useEffect(() => {
    if (!userId || isAdmin) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabaseRef.current
        .from("competition_owners")
        .select("competition_id")
        .eq("user_id", userId);
      if (cancelled) return;
      setOwnedRecruitmentIds(new Set(((data as { competition_id: string }[] | null) ?? []).map((r) => r.competition_id)));
    })();
    return () => { cancelled = true; };
  }, [isAdmin, userId]);

  // Recruitment private details. Admin fetches everything; owners fetch only
  // recruitments they own so the dialog pre-fills correctly when they click
  // edit without leaking other companies' private info. Skip the fetch when
  // there's nothing to ask for; visibility-gating happens in the derived
  // `privateDetails` memo below regardless of the cached fetch.
  useEffect(() => {
    if (publishedRecruitments.length === 0) return;
    if (!isAdmin && ownedRecruitmentIds.size === 0) return;
    const ids = isAdmin
      ? publishedRecruitments.map((r) => r.id)
      : publishedRecruitments.filter((r) => ownedRecruitmentIds.has(r.id)).map((r) => r.id);
    if (ids.length === 0) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabaseRef.current
        .from("competition_private_details")
        .select("competition_id, created_at, updated_at, positions, application_method, contact, required_documents")
        .in("competition_id", ids);
      if (cancelled) return;
      const map = new Map<string, RecruitmentPrivateDetails>();
      for (const row of ((data as RecruitmentPrivateDetails[] | null) ?? [])) {
        map.set(row.competition_id, row);
      }
      setPrivateFetch(map);
    })();
    return () => { cancelled = true; };
  }, [isAdmin, publishedRecruitments, ownedRecruitmentIds]);

  // Derived view of privateFetch that re-applies the permission gate every
  // render. If a non-admin loses ownership of a recruitment, the cached
  // fetch is filtered out here before composeRecruitment ever sees it.
  const privateDetails = useMemo(() => {
    if (!privateFetch || privateFetch.size === 0) return null;
    if (publishedRecruitments.length === 0) return null;
    if (isAdmin) return privateFetch;
    if (ownedRecruitmentIds.size === 0) return null;
    const filtered = new Map<string, RecruitmentPrivateDetails>();
    for (const id of ownedRecruitmentIds) {
      const detail = privateFetch.get(id);
      if (detail) filtered.set(id, detail);
    }
    return filtered.size > 0 ? filtered : null;
  }, [privateFetch, isAdmin, publishedRecruitments, ownedRecruitmentIds]);

  const announcements = useMemo(
    () => (draftAnnouncements.length > 0 ? sortAnnouncements([...draftAnnouncements, ...publishedAnnouncements]) : publishedAnnouncements),
    [draftAnnouncements, publishedAnnouncements],
  );
  const results = useMemo(
    () => (draftResults.length > 0 ? sortResults([...draftResults, ...publishedResults]) : publishedResults),
    [draftResults, publishedResults],
  );
  const recruitments = useMemo(() => {
    if (!privateDetails || privateDetails.size === 0) return publishedRecruitments;
    return publishedRecruitments.map((item) =>
      composeRecruitment(item, privateDetails.get(item.id) ?? null),
    );
  }, [publishedRecruitments, privateDetails]);

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
          {isAdmin && (
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
                  onEdit={(isAdmin || ownedRecruitmentIds.has(item.id)) ? () => openEditSheet(item) : undefined}
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
