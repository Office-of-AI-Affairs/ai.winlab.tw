"use client";

import { EventCard } from "@/components/event-card";
import { EventsCreateButton } from "@/components/events-create-button";
import { useAuth } from "@/components/auth-provider";
import { PageShell } from "@/components/page-shell";
import { Block } from "@/components/ui/block";
import { SubButton } from "@/components/ui/sub-button";
import { createClient } from "@/lib/supabase/client";
import type { Event } from "@/lib/supabase/types";
import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

export function EventsPageClient({
  publishedEvents,
}: {
  publishedEvents: Event[];
}) {
  const { isAdmin } = useAuth();
  const supabaseRef = useRef(createClient());
  const [drafts, setDrafts] = useState<Event[]>([]);

  useEffect(() => {
    if (!isAdmin) { setDrafts([]); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabaseRef.current
        .from("events")
        .select("*")
        .eq("status", "draft")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });
      if (!cancelled) setDrafts((data as Event[] | null) ?? []);
    })();
    return () => { cancelled = true; };
  }, [isAdmin]);

  const events = useMemo(() => {
    if (!isAdmin || drafts.length === 0) return publishedEvents;
    return [...drafts, ...publishedEvents].sort((a, b) => {
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
      return a.created_at < b.created_at ? 1 : -1;
    });
  }, [drafts, isAdmin, publishedEvents]);

  return (
    <PageShell tone="dashboard">
      <Block variant="ghost" className="flex items-center justify-between">
        <SubButton href="/">
          <ArrowLeftIcon className="size-4" /> 返回首頁
        </SubButton>
        {isAdmin && <EventsCreateButton />}
      </Block>

      <div className="w-full grid lg:grid-cols-3 gap-4">
        <div className="col-span-1">
          <Block className="flex flex-col gap-4">
            <h1 className="text-2xl text-foreground font-bold">活動專區</h1>
            <p className="text-muted-foreground">當前共有 {events.length} 場活動</p>
          </Block>
        </div>

        <div className="col-span-1 lg:col-span-2">
          {events.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">目前沒有活動</div>
          ) : (
            <div className="grid gap-4">
              {events.map((item, index) => (
                <Link href={`/events/${item.slug}`} key={item.id} className="h-full">
                  <EventCard item={item} compact priority={index === 0} />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
