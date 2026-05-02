"use client"

import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { createClient } from "@/lib/supabase/client"
import type { TocItem } from "@/lib/ui/article"
import type { PublicProfile, Result } from "@/lib/supabase/types"
import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { ResultArticleClient, type ResultPublisher } from "./article-client"

type State =
  | { kind: "loading" }
  | {
      kind: "draft"
      result: Result
      eventName: string
      publisher: ResultPublisher
      coauthors: PublicProfile[]
      html: string | null
      toc: TocItem[]
      readingTimeMin: number
    }
  | { kind: "missing" }

/**
 * Mirrors app/announcement/[id]/draft-fallback.tsx for results.
 * Author or admin lands on a draft URL → fetch via auth client, hand off
 * to the article client opened directly into edit mode. Other viewers
 * (non-admin, non-author) get a clean 404.
 */
export function ResultDraftFallback({ slug, id }: { slug: string; id: string }) {
  const { user, isLoading } = useAuth()
  const [state, setState] = useState<State>({ kind: "loading" })
  const supabaseRef = useRef(createClient())

  useEffect(() => {
    if (isLoading) return
    if (!user) {
      setState({ kind: "missing" })
      return
    }
    let cancelled = false
    void (async () => {
      const { data: result } = await supabaseRef.current
        .from("results")
        .select("*")
        .eq("id", id)
        .single()
      if (cancelled) return
      if (!result) {
        setState({ kind: "missing" })
        return
      }

      const [{ data: eventRow }, { data: publisherRow }, { data: coauthorRows }] =
        await Promise.all([
          supabaseRef.current
            .from("events")
            .select("name")
            .eq("slug", slug)
            .maybeSingle(),
          result.author_id
            ? supabaseRef.current
                .from("public_profiles")
                .select("id, display_name")
                .eq("id", result.author_id)
                .maybeSingle()
            : Promise.resolve({ data: null }),
          supabaseRef.current
            .from("result_coauthors")
            .select("user_id")
            .eq("result_id", result.id),
        ])

      let coauthors: PublicProfile[] = []
      if (coauthorRows?.length) {
        const userIds = coauthorRows.map((r) => r.user_id)
        const { data: profiles } = await supabaseRef.current
          .from("public_profiles")
          .select("id, created_at, updated_at, display_name")
          .in("id", userIds)
        coauthors = (profiles ?? []) as PublicProfile[]
      }

      const { renderArticle } = await import("@/lib/ui/rich-text")
      const { estimateReadingTime } = await import("@/lib/ui/reading-time")
      const typedResult = result as Result
      const { html, toc } = renderArticle(
        typedResult.content as Record<string, unknown> | null,
      )
      const { minutes } = estimateReadingTime(
        typedResult.content as Record<string, unknown> | null,
      )

      if (cancelled) return
      setState({
        kind: "draft",
        result: typedResult,
        eventName: eventRow?.name ?? "活動",
        publisher: publisherRow
          ? {
              id: publisherRow.id,
              name: publisherRow.display_name || "未知使用者",
            }
          : null,
        coauthors,
        html,
        toc,
        readingTimeMin: minutes,
      })
    })()
    return () => {
      cancelled = true
    }
  }, [id, isLoading, slug, user])

  if (state.kind === "loading") {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12 flex flex-col gap-6">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-9 w-2/3" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-72 w-full" />
      </div>
    )
  }

  if (state.kind === "missing") {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20">
        <div className="flex flex-col items-center gap-4">
          <h1 className="text-2xl font-bold">找不到這份成果</h1>
          <p className="text-muted-foreground">可能已被移除、尚未發布，或網址有誤。</p>
          <Button asChild variant="secondary">
            <Link href={`/events/${slug}?tab=results`}>返回活動</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <ResultArticleClient
      slug={slug}
      eventName={state.eventName}
      initialResult={state.result}
      initialContentHtml={state.html}
      initialToc={state.toc}
      readingTimeMin={state.readingTimeMin}
      initialPublisher={state.publisher}
      initialCoauthors={state.coauthors}
      initialMode="edit"
    />
  )
}
