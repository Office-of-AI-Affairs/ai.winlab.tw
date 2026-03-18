import assert from "node:assert/strict"
import { describe, test } from "node:test"

import { renderToStaticMarkup } from "react-dom/server"

import { AnnouncementTableSkeleton } from "@/components/announcement-table"
import { EventCardSkeleton } from "@/components/event-card"
import { PageShell } from "@/components/page-shell"
import { RecruitmentCardSkeleton } from "@/components/recruitment-card"
import { BlockSkeleton } from "@/components/ui/block"

describe("PageShell render contracts", () => {
  test("renders the dashboard shell classes", () => {
    const html = renderToStaticMarkup(
      <PageShell tone="dashboard">
        <div>content</div>
      </PageShell>
    )

    assert.ok(html.includes('data-slot="page-shell"'))
    assert.ok(html.includes('data-tone="dashboard"'))
    assert.ok(html.includes("max-w-6xl"))
    assert.ok(html.includes("mx-auto"))
    assert.ok(html.includes("p-4"))
    assert.ok(html.includes("gap-4"))
  })

  test("renders the editor shell classes", () => {
    const html = renderToStaticMarkup(
      <PageShell tone="editor">
        <div>content</div>
      </PageShell>
    )

    assert.ok(html.includes('data-tone="editor"'))
    assert.ok(html.includes("mt-8"))
    assert.ok(html.includes("pb-16"))
  })
})

describe("component-owned skeleton render contracts", () => {
  test("renders BlockSkeleton with a skeleton slot and optional media", () => {
    const html = renderToStaticMarkup(
      <BlockSkeleton showMedia lines={4} variant="outline" />
    )

    assert.ok(html.includes('data-slot="block"'))
    assert.ok(html.includes('data-slot="skeleton"'))
    assert.ok(html.includes("aspect-video"))
  })

  test("renders EventCardSkeleton with the card layout shell", () => {
    const html = renderToStaticMarkup(<EventCardSkeleton compact />)

    assert.ok(html.includes('data-slot="block"'))
    assert.ok(html.includes("lg:grid-cols-2"))
    assert.ok(html.includes("rounded-none"))
  })

  test("renders RecruitmentCardSkeleton with card and skeleton slots", () => {
    const html = renderToStaticMarkup(<RecruitmentCardSkeleton />)

    assert.ok(html.includes('data-slot="card"'))
    assert.ok(html.includes('data-slot="skeleton"'))
    assert.ok(html.includes("aspect-video"))
  })

  test("renders AnnouncementTableSkeleton rows in the table structure", () => {
    const html = renderToStaticMarkup(
      <AnnouncementTableSkeleton rows={3} showStatus />
    )

    assert.ok(html.includes("<table"))
    assert.ok(html.includes('data-slot="skeleton"'))
    assert.ok(html.includes("<tbody"))
  })
})
