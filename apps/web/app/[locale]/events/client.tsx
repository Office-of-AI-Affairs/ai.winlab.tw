"use client";

import { EventCard } from "@/components/events/event-card";
import { EventsCreateButton } from "@/components/events/events-create-button";
import { useAuth } from "@/components/layout/auth-provider";
import { PageShell } from "@/components/shared/page-shell";
import { Block } from "@/components/shared/block";
import { SubButton } from "@/components/shared/sub-button";
import { useLocale, useT } from "@/lib/i18n/locale-provider";
import { localizedPath } from "@/lib/i18n/routing";
import { createClient } from "@/lib/supabase/client";
import type { Event } from "@winlab/db";
import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

export function EventsPageClient({
  publishedEvents,
}: {
  publishedEvents: Event[];
}) {
  const t = useT();
  const locale = useLocale();
  const { isAdmin } = useAuth();
  const supabaseRef = useRef(createClient());
  const [drafts, setDrafts] = useState<Event[]>([]);

  // No reset on !isAdmin — useMemo below returns published-only when
  // isAdmin flips false, so any stale drafts in state are inert.
  useEffect(() => {
    if (!isAdmin) return;
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
      <Block variant="ghost" className="flex items-center">
        <SubButton href="/">
          <ArrowLeftIcon className="size-4" /> {t.actions.backHome}
        </SubButton>
      </Block>

      <div className="w-full grid lg:grid-cols-3 gap-4">
        <div className="col-span-1">
          <Block className="flex flex-col gap-4">
            <h1 className="text-2xl text-foreground font-bold">{t.events.list.heading}</h1>
            <p className="text-muted-foreground">{t.events.list.countSummary.replace("{count}", String(events.length))}</p>
            {/* Subscribable calendar of every published event (#46).
                localizedPath here (unlike the plain next/link hrefs below,
                a pre-existing gap out of scope for this change) — the .ics
                content differs per locale (event names), so this link must
                land on the matching locale's route. */}
            <Link
              href={localizedPath("/events/calendar.ics", locale)}
              prefetch={false}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors underline"
            >
              {t.events.list.subscribeCalendar}
            </Link>
          </Block>
        </div>

        <div className="col-span-1 lg:col-span-2">
          {events.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">{t.events.list.empty}</div>
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

      {isAdmin && <EventsCreateButton />}
    </PageShell>
  );
}
