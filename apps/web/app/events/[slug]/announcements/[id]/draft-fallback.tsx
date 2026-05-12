"use client"

import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { createClient } from "@/lib/supabase/client"
import type { TocItem } from "@/lib/ui/article"
import type { Announcement } from "@/lib/supabase/types"
import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { EventAnnouncementArticleClient } from "./article-client"

type State =
  | { kind: "loading" }
  | {
      kind: "draft"
      announcement: Announcement
      eventName: string
      html: string | null
      toc: TocItem[]
      readingTimeMin: number
    }
  | { kind: "missing" }

/**
 * Mirrors app/announcement/[id]/draft-fallback.tsx but for the
 * event-scoped announcement detail. Used when the cookieless lookup
 * couldn't find a published row — admins might be looking at their own
 * draft. Non-admins get a 404 surface.
 */
export function EventAnnouncementDraftFallback({ slug, id }: { slug: string; id: string }) {
  const { isAdmin, isLoading } = useAuth()
  const [state, setState] = useState<State>({ kind: "loading" })
  const supabaseRef = useRef(createClient())

  useEffect(() => {
    if (isLoading) return
    if (!isAdmin) {
      setState({ kind: "missing" })
      return
    }
    let cancelled = false
    void (async () => {
      const [announcementRes, eventRes] = await Promise.all([
        supabaseRef.current
          .from("announcements")
          .select("*")
          .eq("id", id)
          .single(),
        supabaseRef.current
          .from("events")
          .select("name")
          .eq("slug", slug)
          .single(),
      ])
      if (cancelled) return
      if (!announcementRes.data) {
        setState({ kind: "missing" })
        return
      }
      const { renderArticle } = await import("@/lib/ui/rich-text")
      const { estimateReadingTime } = await import("@/lib/ui/reading-time")
      const announcement = announcementRes.data as Announcement
      const { html, toc } = renderArticle(
        announcement.content as Record<string, unknown> | null,
      )
      const { minutes } = estimateReadingTime(
        announcement.content as Record<string, unknown> | null,
      )
      setState({
        kind: "draft",
        announcement,
        eventName: eventRes.data?.name ?? "活動",
        html,
        toc,
        readingTimeMin: minutes,
      })
    })()
    return () => {
      cancelled = true
    }
  }, [id, isAdmin, isLoading, slug])

  if (state.kind === "loading") {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12 flex flex-col gap-6">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-72 w-full" />
      </div>
    )
  }

  if (state.kind === "missing") {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20">
        <div className="flex flex-col items-center gap-4">
          <h1 className="text-2xl font-bold">找不到這則公告</h1>
          <p className="text-muted-foreground">可能已被移除、尚未發布，或網址有誤。</p>
          <Button asChild variant="secondary">
            <Link href={`/events/${slug}?tab=announcements`}>返回活動</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <EventAnnouncementArticleClient
      slug={slug}
      eventName={state.eventName}
      initialAnnouncement={state.announcement}
      initialContentHtml={state.html}
      initialToc={state.toc}
      readingTimeMin={state.readingTimeMin}
      initialMode="edit"
    />
  )
}
