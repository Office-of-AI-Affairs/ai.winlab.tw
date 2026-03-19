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
const recruitmentClient = readFileSync(resolve(process.cwd(), "app/recruitment/client.tsx"), "utf8")
const eventClient = readFileSync(resolve(process.cwd(), "app/events/[slug]/client.tsx"), "utf8")
const recruitmentCard = readFileSync(resolve(process.cwd(), "components/recruitment-card.tsx"), "utf8")
const recruitmentDialog = readFileSync(resolve(process.cwd(), "components/recruitment-dialog.tsx"), "utf8")
const tiptapEditor = readFileSync(resolve(process.cwd(), "components/tiptap-editor.tsx"), "utf8")
const loginPage = readFileSync(resolve(process.cwd(), "app/login/page.tsx"), "utf8")
const forgotPasswordPage = readFileSync(resolve(process.cwd(), "app/forgot-password/page.tsx"), "utf8")
const resetPasswordPage = readFileSync(resolve(process.cwd(), "app/reset-password/page.tsx"), "utf8")
const usersTable = readFileSync(resolve(process.cwd(), "components/users-table.tsx"), "utf8")
const homeEvents = readFileSync(resolve(process.cwd(), "components/home-events.tsx"), "utf8")
const homeAnnouncement = readFileSync(resolve(process.cwd(), "components/home-announcement.tsx"), "utf8")
const homeIntroduction = readFileSync(resolve(process.cwd(), "components/home-introduction.tsx"), "utf8")
const homeOrganization = readFileSync(resolve(process.cwd(), "components/home-organization.tsx"), "utf8")
const privacyEditPage = readFileSync(resolve(process.cwd(), "app/privacy/edit/page.tsx"), "utf8")
const teamPage = readFileSync(resolve(process.cwd(), "app/team/[id]/page.tsx"), "utf8")
const profileClient = readFileSync(resolve(process.cwd(), "app/profile/[id]/client.tsx"), "utf8")
const organizationMemberDialog = readFileSync(resolve(process.cwd(), "components/organization-member-dialog.tsx"), "utf8")
const carouselEditClient = readFileSync(resolve(process.cwd(), "app/carousel/[id]/edit/client.tsx"), "utf8")
const contactEditClient = readFileSync(resolve(process.cwd(), "app/contacts/[id]/edit/client.tsx"), "utf8")
const introductionEditClient = readFileSync(resolve(process.cwd(), "app/introduction/edit/client.tsx"), "utf8")
const organizationEditClient = readFileSync(resolve(process.cwd(), "app/organization/[id]/edit/client.tsx"), "utf8")

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
    assert.ok(!announcementTable.includes("colSpan={showStatus ? 4 : 3}"))
    assert.ok(!announcementTable.includes('paddingLeft: "1.25rem"'))
    assert.ok(announcementClient.includes("getHref={(item) =>"))
    assert.ok(homeAnnouncementTable.includes("getHref={(item) =>"))
  })

  test("recruitment cards own their navigation semantics", () => {
    assert.ok(recruitmentCard.includes("href: string"))
    assert.ok(recruitmentCard.includes("<AppLink"))
    assert.ok(recruitmentPage.includes("RecruitmentPageClient"))
    assert.ok(recruitmentClient.includes("RecruitmentCard"))
    assert.ok(recruitmentClient.includes("href={`/recruitment/${item.id}`}"))
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

  test("buttons are not nested inside links for call-to-action navigation", () => {
    assert.ok(!homeEvents.includes("<Link href=\"/events\">\n          <Button"))
    assert.ok(!homeAnnouncement.includes("<Link href=\"/announcement\">\n          <Button"))
    assert.ok(!homeIntroduction.includes("<Link href=\"/introduction\">\n          <Button"))
    assert.ok(!homeOrganization.includes("<Link href=\"/organization\">\n            <Button"))
    assert.ok(!privacyEditPage.includes("<Link href=\"/privacy\">\n          <Button"))
  })

  test("team result links do not fall back to dead hash hrefs", () => {
    assert.ok(!teamPage.includes(': "#"'))
  })

  test("profile edit mode does not rely on placeholders as the only field labels", () => {
    assert.ok(profileClient.includes('aria-label="姓名"'))
    assert.ok(profileClient.includes('aria-label="個人簡介"'))
    assert.ok(profileClient.includes('aria-label={`連結 ${idx + 1}`}'))
    assert.ok(profileClient.includes('aria-label={`刪除連結 ${idx + 1}`}'))
    assert.ok(!profileClient.includes("<input\n                        aria-label=\"姓名\""))
    assert.ok(!profileClient.includes("<textarea\n                        aria-label=\"個人簡介\""))
    assert.ok(profileClient.includes("<Input"))
    assert.ok(profileClient.includes("<Textarea"))
  })

  test("icon-only destructive controls expose aria labels", () => {
    assert.ok(recruitmentDialog.includes('aria-label={`刪除職缺 ${index + 1}`}'))
    assert.ok(organizationMemberDialog.includes('aria-label="移除照片"'))
  })

  test("editor failure states surface user-visible toast feedback instead of console-only logging", () => {
    for (const content of [
      carouselEditClient,
      contactEditClient,
      introductionEditClient,
      organizationEditClient,
    ]) {
      assert.ok(content.includes("toast.error("))
    }
  })
})
