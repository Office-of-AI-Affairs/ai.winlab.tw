"use client"

import { useAuth } from "@/components/layout/auth-provider"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useLocale, useT } from "@/lib/i18n/locale-provider"
import { localizedField } from "@/lib/i18n/localized-field"
import { getResultDraft } from "@/lib/actions/results"
import type { TocItem } from "@/lib/ui/article"
import type { PublicProfile, Result } from "@winlab/db"
import Link from "next/link"
import { useEffect, useState } from "react"
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
  const t = useT()
  const locale = useLocale()
  const [state, setState] = useState<State>({ kind: "loading" })

  useEffect(() => {
    if (isLoading || !user) return
    let cancelled = false
    void (async () => {
      const draft = await getResultDraft(id, slug).catch(() => null)
      if (cancelled) return
      if (!draft) {
        setState({ kind: "missing" })
        return
      }
      const { result, event: eventRow, publisher: publisherRow } = draft
      const coauthors = draft.coauthors as PublicProfile[]

      const { renderArticle } = await import("@/lib/ui/rich-text")
      const { estimateReadingTime } = await import("@/lib/ui/reading-time")
      const typedResult = result
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
        eventName: eventRow ? localizedField(eventRow, "name", locale).value : t.events.meta.fallbackName,
        publisher: publisherRow
          ? {
              id: publisherRow.id,
              name: publisherRow.display_name || t.common.unknownUser,
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
  }, [id, isLoading, slug, user, t, locale])

  if (isLoading || state.kind === "loading") {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12 flex flex-col gap-6">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-9 w-2/3" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-72 w-full" />
      </div>
    )
  }

  if (!user || state.kind === "missing") {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20">
        <div className="flex flex-col items-center gap-4">
          <h1 className="text-2xl font-bold">{t.results.notFound.title}</h1>
          <p className="text-muted-foreground">{t.events.notFound.description}</p>
          <Button asChild variant="secondary">
            <Link href={`/events/${slug}/results`}>{t.events.backToEvent}</Link>
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
