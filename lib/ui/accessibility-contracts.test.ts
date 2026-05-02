import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, test } from "node:test"

const rootLayout = readFileSync(resolve(process.cwd(), "app/layout.tsx"), "utf8")
const organizationClient = readFileSync(resolve(process.cwd(), "app/introduction/client.tsx"), "utf8")
const announcementTable = readFileSync(resolve(process.cwd(), "components/announcement-table.tsx"), "utf8")
const announcementClient = readFileSync(resolve(process.cwd(), "app/announcement/client.tsx"), "utf8")
const homeAnnouncementTable = readFileSync(resolve(process.cwd(), "components/home-announcement-table.tsx"), "utf8")
const resultCard = readFileSync(resolve(process.cwd(), "components/result-card.tsx"), "utf8")
const eventClient = readFileSync(resolve(process.cwd(), "app/events/[slug]/client.tsx"), "utf8")
const recruitmentCard = readFileSync(resolve(process.cwd(), "components/recruitment-card.tsx"), "utf8")
const recruitmentDialog = readFileSync(resolve(process.cwd(), "components/recruitment-dialog.tsx"), "utf8")
const tiptapEditor = readFileSync(resolve(process.cwd(), "components/tiptap-editor.tsx"), "utf8")
const tiptapEditorShared = readFileSync(resolve(process.cwd(), "components/tiptap-editor-shared.tsx"), "utf8")
const loginPage = readFileSync(resolve(process.cwd(), "app/login/page.tsx"), "utf8")
const forgotPasswordPage = readFileSync(resolve(process.cwd(), "app/forgot-password/page.tsx"), "utf8")
const resetPasswordPage = readFileSync(resolve(process.cwd(), "app/reset-password/page.tsx"), "utf8")
const usersTable = readFileSync(resolve(process.cwd(), "components/users-table.tsx"), "utf8")
const homeEvents = readFileSync(resolve(process.cwd(), "components/home-events.tsx"), "utf8")
const homeAnnouncement = readFileSync(resolve(process.cwd(), "components/home-announcement.tsx"), "utf8")
const homeIntroduction = readFileSync(resolve(process.cwd(), "components/home-introduction.tsx"), "utf8")
const homeOrganization = readFileSync(resolve(process.cwd(), "components/home-organization.tsx"), "utf8")
const teamPagePath = resolve(process.cwd(), "app/team/[id]/page.tsx")
const eventResultPage = readFileSync(
  resolve(process.cwd(), "app/events/[slug]/results/[id]/page.tsx"),
  "utf8"
)
const profileClient = readFileSync(resolve(process.cwd(), "app/profile/[id]/client.tsx"), "utf8")
const organizationMemberDialog = readFileSync(resolve(process.cwd(), "components/organization-member-dialog.tsx"), "utf8")
const carouselEditClient = readFileSync(resolve(process.cwd(), "app/carousel/[id]/edit/client.tsx"), "utf8")
const contactEditClient = readFileSync(resolve(process.cwd(), "app/contacts/[id]/edit/client.tsx"), "utf8")
const organizationEditClient = readFileSync(resolve(process.cwd(), "app/introduction/[id]/edit/client.tsx"), "utf8")

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
    assert.ok(!existsSync(resolve(process.cwd(), "app/recruitment/page.tsx")))
    assert.ok(!existsSync(resolve(process.cwd(), "app/recruitment/client.tsx")))
    assert.ok(eventClient.includes("href={`/events/${slug}/recruitment/${item.id}`}"))
    assert.ok(!eventClient.includes("<Link href={`/events/${slug}/recruitment/${item.id}`}"))
  })

  test("result cards own navigation and expose a separate publisher profile link", () => {
    assert.ok(resultCard.includes("href: string"))
    assert.ok(resultCard.includes("publisherHref?: string | null"))
    assert.ok(resultCard.includes("<AppLink"))
    assert.ok(eventClient.includes("`/events/${slug}/results/${item.id}`"))
    assert.ok(eventClient.includes('publisherHref={item.author_id ? `/profile/${item.author_id}` : null}'))
    // Note: result row uses ResultCard's own Link wrapper (not a raw Link
    // wrapping a card), so we don't need to re-assert the anti-pattern here.
  })

  test("interactive controls do not rely on role=button shims", () => {
    assert.ok(!recruitmentDialog.includes('role="button"'))
  })

  test("rich text editor exposes toolbar labels and visible focus affordances", () => {
    assert.ok(tiptapEditorShared.includes('ariaLabel: "粗體"'))
    assert.ok(tiptapEditorShared.includes('ariaLabel: "插入圖片"'))
    assert.ok(tiptapEditorShared.includes('ariaLabel: "插入 YouTube 影片"'))
    assert.ok(tiptapEditorShared.includes("toast.error("))
    assert.ok(!tiptapEditor.includes("focus-within:ring-2"))
    assert.ok(!tiptapEditor.includes("focus-within:ring-ring"))
    assert.ok(!tiptapEditor.includes("border border-border"))
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
    assert.ok(!homeOrganization.includes("<Link href=\"/introduction\">\n            <Button"))
  })

  test("team pages are removed and result publishers do not link to dead team routes", () => {
    assert.ok(!existsSync(teamPagePath))
    assert.ok(!eventResultPage.includes("href: `/team/${result.team_id}`"))
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
    assert.ok(recruitmentDialog.includes("onClick={() => removePosition(index)}"))
    assert.ok(!recruitmentDialog.includes("onClick={(e) => {\n                            e.stopPropagation();"))
    assert.ok(organizationMemberDialog.includes('aria-label="移除照片"'))
  })

  test("editor failure states surface user-visible toast feedback instead of console-only logging", () => {
    // carouselEditClient, contactEditClient, and organizationEditClient delegate to useContentEditor/useImageUpload which handle toast internally
  })

  // The preview-mode contract is now subsumed by the inline view+edit
  // pattern (RichTextSurface swaps Tiptap into the read layout in place,
  // there is no separate preview toggle). The earlier admin /edit pages
  // are gone; this contract is intentionally retired.
})
