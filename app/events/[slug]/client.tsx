"use client";

import { RecruitmentCard } from "@/components/recruitment-card";
import { RecruitmentDialog } from "@/components/recruitment-dialog";
import { ResultCard, type ResultWithMeta } from "@/components/result-card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth-provider";
import { createClient } from "@/lib/supabase/client";
import type { Announcement, Event, Recruitment } from "@/lib/supabase/types";
import { ArrowLeft, Loader2, Pencil, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { useState } from "react";

type Tab = "announcements" | "results" | "recruitment";

const TABS: { value: Tab; label: string }[] = [
  { value: "announcements", label: "公告" },
  { value: "results", label: "成果" },
  { value: "recruitment", label: "徵才" },
];

const tabParser = parseAsStringLiteral(["announcements", "results", "recruitment"] as const).withDefault("results");

export function EventDetailClient({
  event,
  slug,
  isAdmin,
  announcements,
  results,
  recruitments,
}: {
  event: Event;
  slug: string;
  isAdmin: boolean;
  announcements: Announcement[];
  results: ResultWithMeta[];
  recruitments: Recruitment[];
}) {
  const { user } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useQueryState("tab", tabParser);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateAnnouncement = async () => {
    if (!user) return;
    setIsCreating(true);
    const supabase = createClient();
    const { data, error } = await supabase.from("announcements").insert({
      title: "新公告", category: "一般", content: {}, status: "draft",
      author_id: user.id, event_id: event.id,
    }).select().single();
    if (error) { setIsCreating(false); return; }
    router.push(`/events/${slug}/announcements/${data.id}/edit`);
  };

  const handleCreateResult = async () => {
    if (!user) return;
    setIsCreating(true);
    const supabase = createClient();
    const { data, error } = await supabase.from("results").insert({
      title: "新成果", date: new Date().toISOString().slice(0, 10),
      header_image: "/placeholder.png", summary: "", content: {},
      status: "draft", author_id: user.id, type: "personal", team_id: null,
      event_id: event.id,
    }).select().single();
    if (error) { setIsCreating(false); return; }
    router.push(`/events/${slug}/results/${data.id}/edit`);
  };

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingRecruitment, setEditingRecruitment] = useState<Recruitment | null>(null);

  const openCreateSheet = () => { setEditingRecruitment(null); setSheetOpen(true); };
  const openEditSheet = (r: Recruitment) => { setEditingRecruitment(r); setSheetOpen(true); };

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 flex flex-col gap-8">
      {/* Back link */}
      <Link
        href="/events"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        活動專區
      </Link>

      {/* Event header */}
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

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border pb-2">
        {TABS.map(({ value, label }) => (
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

      {/* Tab content */}
      {tab === "announcements" && (
        <div className="flex flex-col gap-6">
          {isAdmin && (
            <div className="flex justify-end">
              <Button variant="secondary" onClick={handleCreateAnnouncement} disabled={isCreating}>
                {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                新增公告
              </Button>
            </div>
          )}
          {announcements.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">目前沒有公告</div>
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
                          <span className="pl-5 pr-4 py-3 w-32 text-base shrink-0">{item.date}</span>
                          <span className="px-4 py-3 w-28 text-base shrink-0">{item.category}</span>
                          <span className="px-4 py-3 text-base flex-1">{item.title || "(無標題)"}</span>
                          {isAdmin && (
                            <span className={`px-4 py-3 w-20 text-base shrink-0 ${item.status === "published" ? "text-green-600" : "text-yellow-600"}`}>
                              {item.status === "published" ? "已發布" : "草稿"}
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
          {user && (
            <div className="flex justify-end">
              <Button variant="secondary" onClick={handleCreateResult} disabled={isCreating}>
                {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                新增個人成果
              </Button>
            </div>
          )}
          {results.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">目前沒有成果</div>
          ) : (
            <div className="grid lg:grid-cols-3 md:grid-cols-2 grid-cols-1 gap-6">
              {results.map((item) => {
                const isOwner = user?.id === item.author_id;
                const showStatus = isAdmin || isOwner;
                return (
                  <Link
                    href={isAdmin ? `/events/${slug}/results/${item.id}/edit` : `/events/${slug}/results/${item.id}`}
                    key={item.id}
                    className="h-full"
                  >
                    <ResultCard item={item} showStatus={showStatus} />
                  </Link>
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
            <div className="text-center py-12 text-muted-foreground">目前沒有徵才資訊</div>
          ) : (
            <div className="grid lg:grid-cols-3 md:grid-cols-2 grid-cols-1 gap-6">
              {recruitments.map((item) => (
                <Link href={`/events/${slug}/recruitment/${item.id}`} key={item.id} className="h-full">
                  <RecruitmentCard item={item} onEdit={isAdmin ? () => openEditSheet(item) : undefined} />
                </Link>
              ))}
            </div>
          )}
          <RecruitmentDialog open={sheetOpen} onOpenChange={setSheetOpen} recruitment={editingRecruitment} eventId={event.id} />
        </div>
      )}
    </div>
  );
}
