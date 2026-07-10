"use client";

import { AppLink } from "@/components/app-link";
import { useAuth } from "@/components/auth-provider";
import {
  FloatingActionPill,
  FloatingActionStack,
} from "@/components/floating-action-pill";
import { AddMemberButton } from "@/components/member-editor";
import { RecruitmentCard } from "@/components/recruitment-card";
import { ResultCard, type ResultWithMeta } from "@/components/result-card";
import { PageShell } from "@/components/page-shell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useEventActions } from "@/hooks/use-event-actions";
import { formatDate } from "@/lib/date";
import { createClient } from "@/lib/supabase/client";
import { getSurnameStrokes } from "@/lib/chinese-stroke";
import { useT } from "@/lib/i18n/locale-provider";
import { composeRecruitment } from "@winlab/domain";
import type {
  Announcement,
  Event,
  Recruitment,
  RecruitmentPrivateDetails,
  Result,
} from "@winlab/db";
import type { EventMember } from "./data";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Loader2, Pencil, Plus, Search, X } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

// Admin-only dialogs. Lazy-load so the visitor critical path never ships
// the recruitment/event editor forms (and the upload-image module they
// pull in via useImageUpload).
const RecruitmentDialog = dynamic(
  () =>
    import("@/components/recruitment-dialog").then((m) => ({
      default: m.RecruitmentDialog,
    })),
  { ssr: false },
);
const EventEditDialog = dynamic(
  () =>
    import("./event-edit-dialog").then((m) => ({ default: m.EventEditDialog })),
  { ssr: false },
);

function TabSummaryBar({
  countLabel,
  searchValue,
  onSearchChange,
  searchPlaceholder,
}: {
  countLabel: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
}) {
  return (
    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">{countLabel}</p>
      <div className="relative w-full sm:max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          className="pl-9"
        />
      </div>
    </div>
  );
}

export type EventTab = "announcements" | "results" | "recruitment" | "members";

const BASE_TAB_VALUES: EventTab[] = ["announcements", "results", "recruitment"];

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
  tab,
  publishedAnnouncements,
  publishedResults,
  publishedRecruitments,
  initialMembers,
}: {
  event: Event;
  slug: string;
  tab: EventTab;
  publishedAnnouncements: Announcement[];
  publishedResults: ResultWithMeta[];
  publishedRecruitments: Recruitment[];
  initialMembers: EventMember[];
}) {
  const t = useT();
  const { user, isAdmin } = useAuth();
  const userId = user?.id ?? null;
  const supabaseRef = useRef(createClient());
  const {
    isCreatingAnnouncement,
    isCreatingResult,
    createAnnouncement,
    createResult,
    togglePin,
  } = useEventActions(event.id, slug, userId);

  const [currentMembers, setCurrentMembers] = useState(initialMembers);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingRecruitment, setEditingRecruitment] = useState<Recruitment | null>(null);
  const [announcementSearch, setAnnouncementSearch] = useState("");
  const [resultSearch, setResultSearch] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [recruitmentSearch, setRecruitmentSearch] = useState("");
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [eventEditOpen, setEventEditOpen] = useState(false);

  const memberIdSet = useMemo(() => new Set(currentMembers.map((m) => m.id)), [currentMembers]);

  async function removeMember(memberId: string) {
    setRemovingMemberId(memberId);
    const { error } = await supabaseRef.current
      .from("event_participants")
      .delete()
      .eq("event_id", event.id)
      .eq("user_id", memberId);
    if (error) {
      toast.error(t.events.members.removeError);
    } else {
      setCurrentMembers((prev) => prev.filter((m) => m.id !== memberId));
    }
    setRemovingMemberId(null);
  }

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
      const [{ data: authors }, { data: coauthorRows }] = await Promise.all([
        authorIds.length
          ? supabaseRef.current.from("public_profiles").select("id, display_name").in("id", authorIds)
          : Promise.resolve({ data: [] as { id: string; display_name: string | null }[] }),
        supabaseRef.current
          .from("result_coauthors")
          .select("result_id, user_id")
          .in("result_id", drafts.map((r) => r.id)),
      ]);
      const profileMap = Object.fromEntries(
        ((authors as { id: string; display_name: string | null }[] | null) ?? []).map((p) => [p.id, p.display_name]),
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
        list.push({ id: row.user_id, name: profileMap[row.user_id] ?? t.common.unknownUser });
        coauthorsByResult.set(row.result_id, list);
      }
      const composed: ResultWithMeta[] = drafts.map((r) => ({
        ...r,
        author_name: r.author_id ? profileMap[r.author_id] ?? null : null,
        coauthors: coauthorsByResult.get(r.id) ?? [],
      }));
      if (!cancelled) setDraftResults(composed);
    })();
    return () => { cancelled = true; };
  }, [event.id, isAdmin, userId, t]);

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
  const displayedAnnouncements = useMemo(() => {
    const query = announcementSearch.trim().toLowerCase();
    if (!query) return announcements;
    return announcements.filter((item) =>
      (item.title ?? "").toLowerCase().includes(query) ||
      (item.category ?? "").toLowerCase().includes(query),
    );
  }, [announcements, announcementSearch]);

  const results = useMemo(
    () => (draftResults.length > 0 ? sortResults([...draftResults, ...publishedResults]) : publishedResults),
    [draftResults, publishedResults],
  );
  const displayedResults = useMemo(() => {
    const query = resultSearch.trim().toLowerCase();
    if (!query) return results;
    return results.filter((item) =>
      (item.title ?? "").toLowerCase().includes(query) ||
      (item.summary ?? "").toLowerCase().includes(query) ||
      (item.author_name ?? "").toLowerCase().includes(query),
    );
  }, [results, resultSearch]);
  const recruitments = useMemo(() => {
    if (!privateDetails || privateDetails.size === 0) return publishedRecruitments;
    return publishedRecruitments.map((item) =>
      composeRecruitment(item, privateDetails.get(item.id) ?? null),
    );
  }, [publishedRecruitments, privateDetails]);

  // Display order for the recruitment tab: pinned first, then the viewer's
  // own recruitments (vendors complained their card was buried), then by
  // created_at asc as before. Search filters title + company_description.
  const displayedRecruitments = useMemo(() => {
    const sorted = [...recruitments].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      const aOwned = ownedRecruitmentIds.has(a.id);
      const bOwned = ownedRecruitmentIds.has(b.id);
      if (aOwned !== bOwned) return aOwned ? -1 : 1;
      return a.created_at < b.created_at ? -1 : 1;
    });
    const query = recruitmentSearch.trim().toLowerCase();
    if (!query) return sorted;
    return sorted.filter((item) =>
      (item.title ?? "").toLowerCase().includes(query) ||
      (item.company_description ?? "").toLowerCase().includes(query),
    );
  }, [recruitments, ownedRecruitmentIds, recruitmentSearch]);

  const openCreateSheet = () => { setEditingRecruitment(null); setSheetOpen(true); };
  const openEditSheet = (r: Recruitment) => { setEditingRecruitment(r); setSheetOpen(true); };

  const visibleTabs = useMemo(() => {
    const labels: Record<EventTab, string> = {
      announcements: t.events.tabs.announcements,
      results: t.events.tabs.results,
      recruitment: t.events.tabs.recruitment,
      members: t.events.tabs.members,
    };
    const values: EventTab[] = userId ? [...BASE_TAB_VALUES, "members"] : BASE_TAB_VALUES;
    return values.map((value) => ({ value, label: labels[value] }));
  }, [userId, t]);

  // Splits the roster into "has profile" (foregrounded) and "no profile
  // yet" (deprioritised) sections, each bucketed by surname stroke count
  // under "{n} 畫" headers — the same way a printed 名冊 is organised.
  // Names within each bucket stay sorted by the `co-stroke` collator;
  // surnames not in the hardcoded map fall into a final "其他" bucket.
  const memberSections = useMemo(() => {
    const collator = new Intl.Collator("zh-Hant-u-co-stroke");
    const sorted = [...currentMembers].sort((a, b) =>
      collator.compare(a.display_name ?? "", b.display_name ?? ""),
    );
    const total = sorted.length;
    const withProfileTotal = sorted.filter((m) => m.hasProfileData).length;
    const query = memberSearch.trim().toLowerCase();
    const matches = query
      ? sorted.filter((m) => (m.display_name ?? "").toLowerCase().includes(query))
      : sorted;

    const bucket = (members: EventMember[]) => {
      const map = new Map<number | null, EventMember[]>();
      for (const m of members) {
        const stroke = getSurnameStrokes(m.display_name);
        const list = map.get(stroke) ?? [];
        list.push(m);
        map.set(stroke, list);
      }
      return Array.from(map.entries())
        .sort(([a], [b]) => {
          if (a === null) return 1;
          if (b === null) return -1;
          return a - b;
        })
        .map(([stroke, list]) => ({
          key: stroke === null ? "other" : `s${stroke}`,
          label:
            stroke === null
              ? t.events.members.otherStrokeBucket
              : t.events.members.strokeBucket.replace("{stroke}", String(stroke)),
          members: list,
        }));
    };

    const withProfile = matches.filter((m) => m.hasProfileData);
    const withoutProfile = matches.filter((m) => !m.hasProfileData);

    return {
      total,
      withProfileTotal,
      withProfileGroups: bucket(withProfile),
      withoutProfileGroups: bucket(withoutProfile),
      withProfileCount: withProfile.length,
      withoutProfileCount: withoutProfile.length,
      matchCount: matches.length,
    };
  }, [currentMembers, memberSearch, t]);

  return (
    <PageShell>
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        {t.actions.backHome}
      </Link>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{event.name}</h1>
            {event.status === "draft" && <Badge variant="secondary">{t.common.draft}</Badge>}
          </div>
          {event.description && (
            <p className="text-muted-foreground">{event.description}</p>
          )}
        </div>
      </div>

      <div className="flex gap-2 border-b border-border pb-2">
        {visibleTabs.map(({ value, label }) => (
          <Button
            key={value}
            asChild
            variant={tab === value ? "default" : "ghost"}
            size="sm"
          >
            <Link
              href={`/events/${slug}/${value}`}
              aria-current={tab === value ? "page" : undefined}
              prefetch
            >
              {label}
            </Link>
          </Button>
        ))}
      </div>

      {tab === "announcements" && (
        <div className="flex flex-col gap-6">
          {announcements.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">{t.events.empty.announcements}</div>
          ) : (
            <>
              <TabSummaryBar
                countLabel={t.events.count.announcements.replace("{count}", String(announcements.length))}
                searchValue={announcementSearch}
                onSearchChange={setAnnouncementSearch}
                searchPlaceholder={t.events.search.announcements}
              />
              {displayedAnnouncements.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">{t.events.search.noAnnouncements}</div>
              ) : (
                <div className="rounded-xl border border-border overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-muted h-12">
                        <th className="text-base font-bold text-left pl-5 pr-4 py-3 w-32">{t.common.date}</th>
                        <th className="text-base font-bold text-left px-4 py-3 w-28">{t.common.category}</th>
                        <th className="text-base font-bold text-left px-4 py-3">{t.common.title}</th>
                        {isAdmin && <th className="text-base font-bold text-left px-4 py-3 w-20">{t.common.status}</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {displayedAnnouncements.map((item) => (
                        <tr key={item.id} className="h-12 border-t border-border hover:bg-muted/60 transition-colors">
                          <td colSpan={isAdmin ? 4 : 3} className="p-0">
                            <Link
                              href={
                                isAdmin
                                  ? `/events/${slug}/announcements/${item.id}${item.status === "draft" ? "?mode=edit" : ""}`
                                  : `/events/${slug}/announcements/${item.id}`
                              }
                              className="flex items-center w-full h-full"
                            >
                              <span className="pl-5 pr-4 py-3 w-32 text-base shrink-0">{formatDate(item.date)}</span>
                              <span className="px-4 py-3 w-28 text-base shrink-0">{item.category}</span>
                              <span className="px-4 py-3 text-base flex-1">{item.title || t.common.untitled}</span>
                              {isAdmin && (
                                <span className="px-4 py-3 w-20 text-base shrink-0">
                                  <Badge variant={item.status === "published" ? "default" : "secondary"}>
                                    {item.status === "published" ? t.common.published : t.common.draft}
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
            </>
          )}
        </div>
      )}

      {tab === "results" && (
        <div className="flex flex-col gap-6">
          {results.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">{t.events.empty.results}</div>
          ) : (
            <>
              <TabSummaryBar
                countLabel={t.events.count.results.replace("{count}", String(results.length))}
                searchValue={resultSearch}
                onSearchChange={setResultSearch}
                searchPlaceholder={t.events.search.results}
              />
              {displayedResults.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">{t.events.search.noResults}</div>
              ) : (
                <div className="grid lg:grid-cols-3 md:grid-cols-2 grid-cols-1 gap-6">
                  {displayedResults.map((item) => {
                    const isOwner = userId === item.author_id;
                    const showStatus = isAdmin || isOwner;
                    return (
                      <ResultCard
                        key={item.id}
                        item={item}
                        href={
                          isAdmin
                            ? `/events/${slug}/results/${item.id}${item.status === "draft" ? "?mode=edit" : ""}`
                            : `/events/${slug}/results/${item.id}`
                        }
                        publisherHref={item.author_id ? `/profile/${item.author_id}` : null}
                        showStatus={showStatus}
                        isAdmin={isAdmin}
                        onPinToggle={isAdmin ? (id, pinned) => togglePin("results", id, pinned) : undefined}
                      />
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {tab === "recruitment" && (
        <div className="flex flex-col gap-6">
          {recruitments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">{t.events.empty.recruitment}</div>
          ) : (
            <>
              <TabSummaryBar
                countLabel={t.events.count.recruitment.replace("{count}", String(recruitments.length))}
                searchValue={recruitmentSearch}
                onSearchChange={setRecruitmentSearch}
                searchPlaceholder={t.events.search.recruitment}
              />
              {displayedRecruitments.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">{t.events.search.noRecruitment}</div>
              ) : (
                <div className="grid lg:grid-cols-3 md:grid-cols-2 grid-cols-1 gap-6">
                  {displayedRecruitments.map((item) => (
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
            </>
          )}
          {sheetOpen && (
            <RecruitmentDialog
              open={sheetOpen}
              onOpenChange={setSheetOpen}
              recruitment={editingRecruitment}
              eventId={event.id}
            />
          )}
        </div>
      )}

      {tab === "members" && userId && (
        <div className="flex flex-col gap-6">
          {currentMembers.length > 0 && (
            <TabSummaryBar
              countLabel={t.events.count.members
                .replace("{total}", String(memberSections.total))
                .replace("{withProfile}", String(memberSections.withProfileTotal))}
              searchValue={memberSearch}
              onSearchChange={setMemberSearch}
              searchPlaceholder={t.events.search.members}
            />
          )}

          {currentMembers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">{t.events.empty.members}</div>
          ) : (
            <>
              {memberSections.withProfileGroups.map((group) => (
                <div key={`p-${group.key}`} className="flex flex-col gap-3">
                  <div className="flex items-baseline gap-2 border-b border-border pb-1">
                    <h3 className="text-sm font-medium text-muted-foreground">{group.label}</h3>
                    <span className="text-xs text-muted-foreground">{group.members.length}</span>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
                    {group.members.map((member) => (
                      <div key={member.id} className="relative group">
                        <AppLink
                          href={`/profile/${member.id}`}
                          className="flex flex-col items-center gap-2 rounded-lg p-3 hover:bg-muted transition-colors interactive-scale"
                        >
                          <Avatar size="2xl">
                            {member.avatar_url && <AvatarImage src={member.avatar_url} alt={member.display_name ?? ""} />}
                            <AvatarFallback>{(member.display_name ?? "?")[0]}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium text-center line-clamp-1">
                            {member.display_name ?? t.common.unknownUser}
                          </span>
                        </AppLink>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeMember(member.id); }}
                            disabled={removingMemberId === member.id}
                            aria-label={t.events.members.removeAria.replace("{name}", member.display_name ?? t.events.members.removeAriaFallback)}
                            className="absolute top-1 right-1 size-6 rounded-full bg-background/90 border border-border flex items-center justify-center opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground hover:border-destructive"
                          >
                            {removingMemberId === member.id ? (
                              <Loader2 className="size-3 animate-spin" />
                            ) : (
                              <X className="size-3" />
                            )}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {memberSections.withoutProfileCount > 0 && (
                <div className="flex flex-col gap-4 mt-4">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-medium text-muted-foreground">{t.events.members.noProfileHeading}</h2>
                    <Badge variant="secondary">{memberSections.withoutProfileCount}</Badge>
                  </div>
                  {memberSections.withoutProfileGroups.map((group) => (
                    <div key={`np-${group.key}`} className="flex flex-col gap-3">
                      <div className="flex items-baseline gap-2 border-b border-border pb-1">
                        <h3 className="text-sm font-medium text-muted-foreground">{group.label}</h3>
                        <span className="text-xs text-muted-foreground">{group.members.length}</span>
                      </div>
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
                        {group.members.map((member) => (
                          <div key={member.id} className="relative group">
                            <div className="flex flex-col items-center gap-2 rounded-lg p-3 opacity-60">
                              <Avatar size="2xl">
                                {member.avatar_url && <AvatarImage src={member.avatar_url} alt={member.display_name ?? ""} />}
                                <AvatarFallback>{(member.display_name ?? "?")[0]}</AvatarFallback>
                              </Avatar>
                              <span className="text-sm text-center line-clamp-1 text-muted-foreground">
                                {member.display_name ?? t.common.unknownUser}
                              </span>
                            </div>
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => removeMember(member.id)}
                                disabled={removingMemberId === member.id}
                                aria-label={t.events.members.removeAria.replace("{name}", member.display_name ?? t.events.members.removeAriaFallback)}
                                className="absolute top-1 right-1 size-6 rounded-full bg-background/90 border border-border flex items-center justify-center opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground hover:border-destructive"
                              >
                                {removingMemberId === member.id ? (
                                  <Loader2 className="size-3 animate-spin" />
                                ) : (
                                  <X className="size-3" />
                                )}
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {memberSections.matchCount === 0 && (
                <div className="text-center py-12 text-muted-foreground">{t.events.search.noMembers}</div>
              )}
            </>
          )}
        </div>
      )}

      {/* Floating actions for this page — admin sees `編輯活動` always +
          the active tab's create pill; non-admin logged-in users see the
          `+新增成果` pill on the results tab. Stack so multiple pills
          line up cleanly at the bottom-right anchor. */}
      <FloatingActionStack>
        {isAdmin && (
          <FloatingActionPill
            inline
            icon={Pencil}
            label={t.events.actions.editEvent}
            onClick={() => setEventEditOpen(true)}
          />
        )}
        {tab === "announcements" && isAdmin && (
          <FloatingActionPill
            inline
            icon={Plus}
            label={isCreatingAnnouncement ? t.common.creating : t.events.actions.newAnnouncement}
            onClick={createAnnouncement}
            loading={isCreatingAnnouncement}
          />
        )}
        {tab === "results" && userId && (
          <FloatingActionPill
            inline
            icon={Plus}
            label={isCreatingResult ? t.common.creating : t.events.actions.newResult}
            onClick={createResult}
            loading={isCreatingResult}
          />
        )}
        {tab === "recruitment" && isAdmin && (
          <FloatingActionPill
            inline
            icon={Plus}
            label={t.events.actions.newRecruitment}
            onClick={openCreateSheet}
          />
        )}
        {tab === "members" && isAdmin && userId && (
          <AddMemberButton
            eventId={event.id}
            memberIds={memberIdSet}
            inline
            onMemberAdded={(profile) =>
              setCurrentMembers((prev) => [
                ...prev,
                {
                  id: profile.id,
                  display_name: profile.display_name,
                  avatar_url: profile.avatar_url,
                  hasProfileData: profile.has_profile_data,
                },
              ])
            }
          />
        )}
      </FloatingActionStack>

      {isAdmin && eventEditOpen && (
        <EventEditDialog
          open={eventEditOpen}
          onOpenChange={setEventEditOpen}
          event={event}
        />
      )}
    </PageShell>
  );
}
