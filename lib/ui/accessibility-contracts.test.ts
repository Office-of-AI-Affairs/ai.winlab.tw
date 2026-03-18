import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, test } from "node:test"

const rootLayout = readFileSync(resolve(process.cwd(), "app/layout.tsx"), "utf8")
const organizationClient = readFileSync(resolve(process.cwd(), "app/organization/client.tsx"), "utf8")
const announcementTable = readFileSync(resolve(process.cwd(), "components/announcement-table.tsx"), "utf8")
const announcementClient = readFileSync(resolve(process.cwd(), "app/announcement/client.tsx"), "utf8")
const homeAnnouncementTable = readFileSync(resolve(process.cwd(), "components/home-announcement-table.tsx"), "utf8")
const recruitmentPage = readFileSync(resolve(process.cwd(), "app/recruitment/page.tsx"), "utf8")
const eventClient = readFileSync(resolve(process.cwd(), "app/events/[slug]/client.tsx"), "utf8")
const recruitmentCard = readFileSync(resolve(process.cwd(), "components/recruitment-card.tsx"), "utf8")
const recruitmentDialog = readFileSync(resolve(process.cwd(), "components/recruitment-dialog.tsx"), "utf8")
const tiptapEditor = readFileSync(resolve(process.cwd(), "components/tiptap-editor.tsx"), "utf8")
const loginPage = readFileSync(resolve(process.cwd(), "app/login/page.tsx"), "utf8")
const forgotPasswordPage = readFileSync(resolve(process.cwd(), "app/forgot-password/page.tsx"), "utf8")
const resetPasswordPage = readFileSync(resolve(process.cwd(), "app/reset-password/page.tsx"), "utf8")
const usersTable = readFileSync(resolve(process.cwd(), "components/users-table.tsx"), "utf8")

describe("accessibility contracts", () => {
  test("root layout provides a skip link and a main landmark", () => {
    assert.ok(rootLayout.includes('href="#main-content"'))
    assert.ok(rootLayout.includes('<main id="main-content"'))
  })

  test("organization page does not rely on window.open for member navigation", () => {
    assert.ok(!organizationClient.includes("window.open("))
    assert.ok(organizationClient.includes("href={member.website!}"))
  })

  test("announcement navigation uses real hrefs instead of clickable rows", () => {
    assert.ok(!announcementTable.includes("onRowClick"))
    assert.ok(announcementTable.includes("getHref"))
    assert.ok(announcementTable.includes("<AppLink"))
    assert.ok(announcementClient.includes("getHref={(item) =>"))
    assert.ok(homeAnnouncementTable.includes("getHref={(item) =>"))
  })

  test("recruitment cards own their navigation semantics", () => {
    assert.ok(recruitmentCard.includes("href: string"))
    assert.ok(recruitmentCard.includes("<AppLink"))
    assert.ok(recruitmentPage.includes("RecruitmentCard"))
    assert.ok(recruitmentPage.includes("href={`/recruitment/${item.id}`}"))
    assert.ok(!recruitmentPage.includes("<Link href={`/recruitment/${item.id}`}"))
    assert.ok(eventClient.includes("href={`/events/${slug}/recruitment/${item.id}`}"))
    assert.ok(!eventClient.includes("<Link href={`/events/${slug}/recruitment/${item.id}`}"))
  })

  test("interactive controls do not rely on role=button shims", () => {
    assert.ok(!recruitmentDialog.includes('role="button"'))
  })

  test("rich text editor exposes toolbar labels and visible focus affordances", () => {
    assert.ok(tiptapEditor.includes('ariaLabel="粗體"'))
    assert.ok(tiptapEditor.includes('ariaLabel="插入 YouTube 影片"'))
    assert.ok(tiptapEditor.includes("focus-within:ring-2"))
    assert.ok(tiptapEditor.includes("focus-within:ring-ring"))
  })

  test("auth flows and import feedback expose autocomplete and live regions", () => {
    assert.ok(loginPage.includes('autoComplete="email"'))
    assert.ok(loginPage.includes('autoComplete="current-password"'))
    assert.ok(loginPage.includes('role="alert"'))
    assert.ok(forgotPasswordPage.includes('autoComplete="email"'))
    assert.ok(forgotPasswordPage.includes('role="status"'))
    assert.ok(resetPasswordPage.includes('autoComplete="new-password"'))
    assert.ok(resetPasswordPage.includes('role="status"'))
    assert.ok(resetPasswordPage.includes('role="alert"'))
    assert.ok(usersTable.includes('aria-live="polite"'))
  })
})
