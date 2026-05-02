"use client"

import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { createClient } from "@/lib/supabase/client"
import type { TocItem } from "@/lib/ui/article"
import type { Announcement } from "@/lib/supabase/types"
import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { AnnouncementArticleClient } from "./article-client"

type State =
  | { kind: "loading" }
  | { kind: "draft"; announcement: Announcement; html: string | null; toc: TocItem[]; readingTimeMin: number }
  | { kind: "missing" }

/**
 * Rendered by /announcement/[id]/page.tsx when the cookieless lookup
 * couldn't find a published row. Admins might be looking at their own
 * draft — we do the authenticated fetch here and hand off to
 * AnnouncementArticleClient with initialMode="edit". Non-admins (and
 * admins looking at a truly missing id) get a 404 surface.
 */
export function AnnouncementDraftFallback({ id }: { id: string }) {
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
      const { data } = await supabaseRef.current
        .from("announcements")
        .select("*")
        .eq("id", id)
        .single()
      if (cancelled) return
      if (!data) {
        setState({ kind: "missing" })
        return
      }
      const { renderArticle } = await import("@/lib/ui/rich-text")
      const { estimateReadingTime } = await import("@/lib/ui/reading-time")
      const announcement = data as Announcement
      const { html, toc } = renderArticle(
        announcement.content as Record<string, unknown> | null,
      )
      const { minutes } = estimateReadingTime(
        announcement.content as Record<string, unknown> | null,
      )
      setState({ kind: "draft", announcement, html, toc, readingTimeMin: minutes })
    })()
    return () => { cancelled = true }
  }, [id, isAdmin, isLoading])

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
            <Link href="/announcement">返回公告列表</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <AnnouncementArticleClient
      initialAnnouncement={state.announcement}
      initialContentHtml={state.html}
      initialToc={state.toc}
      readingTimeMin={state.readingTimeMin}
      initialMode="edit"
    />
  )
}
