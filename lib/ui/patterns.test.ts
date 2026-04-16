import assert from "node:assert/strict"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { resolve } from "node:path"
import { describe, test } from "node:test"

import { getAutoLinkProps, pageSectionVariants, pageShellVariants } from "./patterns"

const globalsCss = readFileSync(resolve(process.cwd(), "app/globals.css"), "utf8")
const claudeMd = readFileSync(resolve(process.cwd(), "CLAUDE.md"), "utf8")
const homeIntroduction = readFileSync(resolve(process.cwd(), "components/home-introduction.tsx"), "utf8")
const recruitmentDialog = readFileSync(resolve(process.cwd(), "components/recruitment-dialog.tsx"), "utf8")
const organizationMemberDialog = readFileSync(resolve(process.cwd(), "components/organization-member-dialog.tsx"), "utf8")
const tiptapEditor = readFileSync(resolve(process.cwd(), "components/tiptap-editor.tsx"), "utf8")
const profileClient = readFileSync(resolve(process.cwd(), "app/profile/[id]/client.tsx"), "utf8")
const resultTagSidebar = readFileSync(resolve(process.cwd(), "components/result-tag-sidebar.tsx"), "utf8")
const tiptapDesktopBubbleMenu = readFileSync(resolve(process.cwd(), "components/tiptap-desktop-bubble-menu.tsx"), "utf8")
const tiptapDesktopFloatingMenu = readFileSync(resolve(process.cwd(), "components/tiptap-desktop-floating-menu.tsx"), "utf8")
const tiptapMobileToolbar = readFileSync(resolve(process.cwd(), "components/tiptap-mobile-toolbar.tsx"), "utf8")
const carouselClient = readFileSync(resolve(process.cwd(), "components/carousel-client.tsx"), "utf8")
const introductionEditButton = readFileSync(resolve(process.cwd(), "components/introduction-edit-button.tsx"), "utf8")
const contactsEditButton = readFileSync(resolve(process.cwd(), "components/contacts-edit-button.tsx"), "utf8")
const eventsCreateButton = readFileSync(resolve(process.cwd(), "components/events-create-button.tsx"), "utf8")
const eventDetailClient = readFileSync(resolve(process.cwd(), "app/events/[slug]/client.tsx"), "utf8")
const richTextContract = readFileSync(resolve(process.cwd(), "lib/ui/rich-text.ts"), "utf8")
const announcementDetail = readFileSync(resolve(process.cwd(), "components/announcement-detail.tsx"), "utf8")
const introductionDetail = readFileSync(resolve(process.cwd(), "components/introduction-detail.tsx"), "utf8")
const resultDetail = readFileSync(resolve(process.cwd(), "components/result-detail.tsx"), "utf8")
const privacyPage = readFileSync(resolve(process.cwd(), "app/privacy/page.tsx"), "utf8")

function collectProjectFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const filePath = resolve(directory, entry)
    const stats = statSync(filePath)

    if (stats.isDirectory()) {
      return collectProjectFiles(filePath)
    }

    if (!/\.(css|ts|tsx)$/.test(filePath)) {
      return []
    }

    return [filePath]
  })
}

describe("global UI patterns", () => {
  test("defines a shared interactive scale utility with duration-200", () => {
    assert.ok(globalsCss.includes(".interactive-scale"))
    assert.ok(globalsCss.includes("duration-200"))
    assert.ok(globalsCss.includes("hover:scale-[1.02]"))
    assert.ok(globalsCss.includes("active:scale-[0.98]"))
  })

  test("maps page section variants to the agreed spacing tiers", () => {
    assert.ok(pageSectionVariants({ tone: "home" }).includes("page-section-home"))
    assert.ok(pageSectionVariants({ tone: "content" }).includes("page-section-content"))
    assert.ok(pageSectionVariants({ tone: "admin" }).includes("page-section-admin"))
    assert.ok(globalsCss.includes(".page-section-home"))
    assert.ok(globalsCss.includes("py-16"))
    assert.ok(globalsCss.includes(".page-section-content"))
    assert.ok(globalsCss.includes("py-12"))
    assert.ok(globalsCss.includes(".page-section-admin"))
    assert.ok(globalsCss.includes("py-8"))
  })

  test("maps page shell variants to the agreed route wrappers", () => {
    assert.ok(pageShellVariants({ tone: "content" }).includes("max-w-6xl"))
    assert.ok(pageShellVariants({ tone: "content" }).includes("py-12"))
    assert.ok(pageShellVariants({ tone: "dashboard" }).includes("p-4"))
    assert.ok(pageShellVariants({ tone: "editor" }).includes("mt-8"))
    assert.ok(pageShellVariants({ tone: "editor" }).includes("pb-16"))
    assert.ok(pageShellVariants({ tone: "auth" }).includes("min-h-[calc(100vh-10rem)]"))
    assert.ok(pageShellVariants({ tone: "profile" }).includes("max-w-6xl"))
    assert.ok(pageShellVariants({ tone: "profile" }).includes("w-full"))
  })

  test("does not allow transition-all in app, components, or lib source files", () => {
    const sourceFiles = [
      ...collectProjectFiles(resolve(process.cwd(), "app")),
      ...collectProjectFiles(resolve(process.cwd(), "components")),
      ...collectProjectFiles(resolve(process.cwd(), "lib")),
    ]

    const offenders = sourceFiles.filter((filePath) => {
      if (filePath.endsWith("/lib/ui/patterns.test.ts")) {
        return false
      }
      const content = readFileSync(filePath, "utf8")
      return content.includes("transition-all") || content.includes("transition: all")
    })

    assert.deepEqual(offenders, [])
  })

  test("does not allow scattered toLocaleDateString calls in app, components, or lib source files", () => {
    const sourceFiles = [
      ...collectProjectFiles(resolve(process.cwd(), "app")),
      ...collectProjectFiles(resolve(process.cwd(), "components")),
      ...collectProjectFiles(resolve(process.cwd(), "lib")),
    ]

    const offenders = sourceFiles.filter((filePath) => {
      if (filePath.endsWith("/lib/ui/patterns.test.ts")) {
        return false
      }
      const content = readFileSync(filePath, "utf8")
      return content.includes("toLocaleDateString(")
    })

    assert.deepEqual(offenders, [])
  })

  test("uses typographic ellipsis in user-facing copy where the repo already standardizes it", () => {
    assert.ok(!homeIntroduction.includes('+ "..."'))
    assert.ok(!recruitmentDialog.includes("上傳中..."))
    assert.ok(!recruitmentDialog.includes("例：履歷、作品集、成績單..."))
    assert.ok(!organizationMemberDialog.includes("上傳中..."))
    assert.ok(!tiptapEditor.includes("開始撰寫公告內容..."))
    assert.ok(!profileClient.includes("簡短說明..."))
  })

  test("prefers managed focus over autoFocus in application components", () => {
    assert.ok(!resultTagSidebar.includes("autoFocus"))
  })

  test("lightweight auth-aware client components do not depend on useAuth when server props can provide the same state", () => {
    for (const content of [
      carouselClient,
      introductionEditButton,
      contactsEditButton,
      eventsCreateButton,
      eventDetailClient,
    ]) {
      assert.ok(!content.includes('from "@/components/auth-provider"'))
      assert.ok(!content.includes("useAuth("))
    }
  })

  test("shares one rich-text contract across read and edit surfaces", () => {
    assert.ok(richTextContract.includes("richTextDocumentClassName"))
    assert.ok(richTextContract.includes("editableRichTextDocumentClassName"))
    assert.ok(announcementDetail.includes("richTextDocumentClassName"))
    assert.ok(introductionDetail.includes("richTextDocumentClassName"))
    assert.ok(resultDetail.includes("richTextDocumentClassName"))
    assert.ok(privacyPage.includes("richTextDocumentClassName"))
    assert.ok(tiptapEditor.includes("editableRichTextDocumentClassName"))
    assert.ok(!privacyPage.includes("prose-neutral dark:prose-invert"))
  })
})

describe("getAutoLinkProps", () => {
  test("opens external http links in a new tab", () => {
    assert.deepEqual(getAutoLinkProps("https://example.com"), {
      rel: "noopener noreferrer",
      target: "_blank",
    })
  })

  test("keeps local routes in the same tab", () => {
    assert.deepEqual(getAutoLinkProps("/events"), {})
  })

  test("does not force mailto links into a new tab", () => {
    assert.deepEqual(getAutoLinkProps("mailto:test@example.com"), {})
  })
})

describe("skeleton architecture guidance", () => {
  test("documents component-owned skeletons instead of page-owned skeleton abstractions", () => {
    assert.ok(claudeMd.includes("High-level UI components should own their matching skeleton components"))
    assert.ok(claudeMd.includes("Route-level loading files should compose layout with component-owned skeletons"))
  })

  test("documents the notion-like editor split between desktop contextual controls and mobile toolbar controls", () => {
    assert.ok(claudeMd.includes("Desktop Tiptap editing should use contextual controls"))
    assert.ok(claudeMd.includes("BubbleMenu"))
    assert.ok(claudeMd.includes("FloatingMenu"))
    assert.ok(claudeMd.includes("`/`-triggered insertion"))
    assert.ok(claudeMd.includes("Mobile Tiptap editing should use a dedicated compact toolbar"))
    assert.ok(tiptapEditor.includes("<TiptapDesktopBubbleMenu"))
    assert.ok(tiptapEditor.includes("<TiptapDesktopFloatingMenu"))
    assert.ok(tiptapEditor.includes("<TiptapMobileToolbar"))
    assert.ok(tiptapDesktopBubbleMenu.includes("BubbleMenu"))
    assert.ok(tiptapDesktopFloatingMenu.includes("FloatingMenu"))
    assert.ok(tiptapDesktopFloatingMenu.includes('data-slot="tiptap-slash-menu"'))
    assert.ok(tiptapMobileToolbar.includes('data-slot="tiptap-mobile-toolbar"'))
  })
})
