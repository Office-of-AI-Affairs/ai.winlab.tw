import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, test } from "node:test"

import SettingsLoading from "@/app/settings/loading"
import SettingsUsersLoading from "@/app/settings/users/loading"
import { renderToStaticMarkup } from "react-dom/server"

import { AnnouncementTableSkeleton } from "@/components/announcement-table"
import { EventCardSkeleton } from "@/components/event-card"
import { PageShell } from "@/components/page-shell"
import { ResultCard } from "@/components/result-card"
import { RecruitmentCardSkeleton } from "@/components/recruitment-card"
import { RecruitmentDetail } from "@/components/recruitment-detail"
import { SettingsMenuSkeleton } from "@/components/settings-menu"
import { UsersTableSkeleton } from "@/components/users-table"
import { BlockSkeleton } from "@/components/ui/block"
import type { Recruitment, Result } from "@/lib/supabase/types"

const tiptapEditorSource = readFileSync(resolve(process.cwd(), "components/tiptap-editor.tsx"), "utf8")
const tiptapSharedCommandsPath = resolve(process.cwd(), "components/tiptap-editor-shared.tsx")
const tiptapSharedCommandsSource = existsSync(tiptapSharedCommandsPath)
  ? readFileSync(tiptapSharedCommandsPath, "utf8")
  : ""
const tiptapDesktopBubbleMenuPath = resolve(process.cwd(), "components/tiptap-desktop-bubble-menu.tsx")
const tiptapDesktopFloatingMenuPath = resolve(process.cwd(), "components/tiptap-desktop-floating-menu.tsx")
const tiptapDesktopBubbleMenuSource = existsSync(tiptapDesktopBubbleMenuPath)
  ? readFileSync(tiptapDesktopBubbleMenuPath, "utf8")
  : ""
const tiptapMobileToolbarPath = resolve(process.cwd(), "components/tiptap-mobile-toolbar.tsx")
const richTextContractPath = resolve(process.cwd(), "lib/ui/rich-text.ts")
const richTextContractSource = existsSync(richTextContractPath)
  ? readFileSync(richTextContractPath, "utf8")
  : ""
const tiptapMobileToolbarSource = existsSync(tiptapMobileToolbarPath)
  ? readFileSync(tiptapMobileToolbarPath, "utf8")
  : ""

const recruitmentFixture: Recruitment = {
  id: "rec_1",
  created_at: "2026-03-21T00:00:00.000Z",
  updated_at: "2026-03-21T00:00:00.000Z",
  title: "企業實習招募",
  link: "https://example.com/apply",
  image: null,
  company_description: "這是公開簡介",
  start_date: "2026-04-01",
  end_date: "2026-05-01",
  positions: [
    {
      name: "AI 實習生",
      location: "Taipei",
      type: "internship",
      count: 2,
      salary: "200/hr",
      responsibilities: "建立模型",
      requirements: "熟悉 Python",
      nice_to_have: "有競賽經驗",
    },
  ],
  application_method: {
    email: "jobs@example.com",
    other: "請附上履歷與作品集",
  },
  contact: {
    name: "王小明",
    email: "contact@example.com",
    phone: "0912345678",
  },
  required_documents: "履歷、成績單",
  event_id: null,
  created_by: null,
  pinned: false,
}

const resultFixture: Result = {
  id: "res_1",
  created_at: "2026-03-21T00:00:00.000Z",
  updated_at: "2026-03-21T00:00:00.000Z",
  title: "個人作品",
  date: "2026-03-21",
  header_image: null,
  summary: "這是摘要",
  content: {},
  status: "published",
  author_id: "user_1",
  pinned: false,
  event_id: "evt_1",
}

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

  test("hides protected recruitment sections from signed-out viewers", () => {
    const html = renderToStaticMarkup(
      <RecruitmentDetail
        recruitment={recruitmentFixture}
        backHref="/recruitment"
        backLabel="返回列表"
        canViewPrivateDetails={false}
      />
    )

    assert.ok(html.includes("這是公開簡介"))
    assert.ok(html.includes("登入後可查看"))
    assert.ok(!html.includes("AI 實習生"))
    assert.ok(!html.includes("王小明"))
    assert.ok(!html.includes("jobs@example.com"))
    assert.ok(!html.includes("履歷、成績單"))
  })

  test("renders protected recruitment sections for signed-in viewers", () => {
    const html = renderToStaticMarkup(
      <RecruitmentDetail
        recruitment={recruitmentFixture}
        backHref="/recruitment"
        backLabel="返回列表"
        canViewPrivateDetails
      />
    )

    assert.ok(html.includes("AI 實習生"))
    assert.ok(html.includes("聯絡窗口"))
    assert.ok(html.includes("應徵方式"))
    assert.ok(html.includes("應備文件"))
    assert.ok(!html.includes("登入後可查看"))
  })

  test("renders recruitment cover images at full width without forcing a video crop", () => {
    const html = renderToStaticMarkup(
      <RecruitmentDetail
        recruitment={{ ...recruitmentFixture, image: "https://example.com/poster.png" }}
        backHref="/recruitment"
        backLabel="返回列表"
        canViewPrivateDetails
      />
    )

    assert.ok(html.includes("w-full"))
    assert.ok(html.includes("object-cover"))
    assert.ok(html.includes("aspect-ratio"))
  })

  test("renders AnnouncementTableSkeleton rows in the table structure", () => {
    const html = renderToStaticMarkup(
      <AnnouncementTableSkeleton rows={3} showStatus />
    )

    assert.ok(html.includes("<table"))
    assert.ok(html.includes('data-slot="skeleton"'))
    assert.ok(html.includes("<tbody"))
  })

  test("renders SettingsMenuSkeleton with the settings list rhythm", () => {
    const html = renderToStaticMarkup(<SettingsMenuSkeleton items={3} />)

    assert.ok(html.includes('data-slot="settings-menu-skeleton"'))
    assert.ok(html.includes("divide-y"))
    assert.ok(html.includes("rounded-2xl"))
    assert.ok(html.includes('data-slot="skeleton"'))
  })

  test("renders UsersTableSkeleton with actions, table, and summary", () => {
    const html = renderToStaticMarkup(<UsersTableSkeleton rows={5} />)

    assert.ok(html.includes('data-slot="users-table-skeleton"'))
    assert.ok(html.includes("<table"))
    assert.ok(html.includes("justify-between"))
    assert.ok(html.includes("text-right"))
  })

  test("renders personal result cards with a clickable publisher link", () => {
    const html = renderToStaticMarkup(
      <ResultCard
        item={{ ...resultFixture, author_name: "蕭哲安" }}
        href="/events/ai-rising-star/results/res_1"
        publisherHref="/profile/user_1"
      />
    )

    assert.ok(html.includes('href="/events/ai-rising-star/results/res_1"'))
    assert.ok(html.includes('href="/profile/user_1"'))
    assert.ok(html.includes("蕭哲安"))
    assert.ok(!html.includes("匿名"))
  })
})

describe("tiptap editor render contracts", () => {
  test("defines a canvas-first editor shell instead of a fixed bottom toolbar wrapper", () => {
    assert.ok(tiptapEditorSource.includes('data-slot="tiptap-editor"'))
    assert.ok(tiptapEditorSource.includes('data-slot="tiptap-canvas"'))
    assert.ok(!tiptapEditorSource.includes("fixed inset-x-0 bottom-0"))
  })

  test("matches read-mode document typography more closely than a padded widget shell", () => {
    assert.ok(existsSync(richTextContractPath))
    assert.ok(richTextContractSource.includes("richTextDocumentClassName"))
    assert.ok(richTextContractSource.includes("editableRichTextDocumentClassName"))
    assert.ok(richTextContractSource.includes("prose prose-sm sm:prose-base max-w-none [&_img]:pt-4"))
    assert.ok(tiptapEditorSource.includes("editableRichTextDocumentClassName"))
    assert.ok(!tiptapEditorSource.includes("min-h-[300px] focus:outline-none p-4"))
  })

  test("extracts shared tiptap command definitions for future desktop and mobile controls", () => {
    assert.ok(existsSync(tiptapSharedCommandsPath))
    assert.ok(tiptapSharedCommandsSource.includes("textFormattingCommands"))
    assert.ok(tiptapSharedCommandsSource.includes("headingCommands"))
    assert.ok(tiptapDesktopBubbleMenuSource.includes("textFormattingCommands"))
    assert.ok(tiptapMobileToolbarSource.includes("textFormattingCommands"))
  })

  test("composes a dedicated desktop bubble menu component", () => {
    assert.ok(existsSync(tiptapDesktopBubbleMenuPath))
    assert.ok(tiptapEditorSource.includes('from "./tiptap-desktop-bubble-menu"'))
    assert.ok(tiptapEditorSource.includes("<TiptapDesktopBubbleMenu"))
  })

  test("composes a dedicated desktop floating menu component for block insertion", () => {
    assert.ok(existsSync(tiptapDesktopFloatingMenuPath))
    assert.ok(tiptapEditorSource.includes('from "./tiptap-desktop-floating-menu"'))
    assert.ok(tiptapEditorSource.includes("<TiptapDesktopFloatingMenu"))
    assert.ok(readFileSync(tiptapDesktopFloatingMenuPath, "utf8").includes('data-slot="tiptap-slash-menu"'))
    assert.ok(readFileSync(tiptapDesktopFloatingMenuPath, "utf8").includes('text.startsWith("/")'))
  })

  test("composes a dedicated mobile toolbar component", () => {
    assert.ok(existsSync(tiptapMobileToolbarPath))
    assert.ok(tiptapEditorSource.includes('from "./tiptap-mobile-toolbar"'))
    assert.ok(tiptapEditorSource.includes("<TiptapMobileToolbar"))
  })

  test("mobile toolbar exposes a dedicated block insertion trigger", () => {
    assert.ok(tiptapMobileToolbarSource.includes('data-slot="tiptap-mobile-insert-trigger"'))
    assert.ok(tiptapMobileToolbarSource.includes("開啟插入選單"))
    assert.ok(tiptapMobileToolbarSource.includes("blockCommands"))
  })
})

describe("settings route loading contracts", () => {
  test("renders /settings loading with the content shell and menu skeleton", () => {
    const html = renderToStaticMarkup(<SettingsLoading />)

    assert.ok(html.includes('data-slot="page-shell"'))
    assert.ok(html.includes('data-tone="content"'))
    assert.ok(html.includes('data-slot="settings-menu-skeleton"'))
  })

  test("renders /settings/users loading with the content shell and users table skeleton", () => {
    const html = renderToStaticMarkup(<SettingsUsersLoading />)

    assert.ok(html.includes('data-slot="page-shell"'))
    assert.ok(html.includes('data-tone="content"'))
    assert.ok(html.includes('data-slot="users-table-skeleton"'))
    assert.ok(html.includes("mb-8"))
  })
})
