import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, test } from "node:test"

const rootLayout = readFileSync(resolve(process.cwd(), "app/layout.tsx"), "utf8")
const homePage = readFileSync(resolve(process.cwd(), "app/page.tsx"), "utf8")
const announcementPage = readFileSync(resolve(process.cwd(), "app/announcement/page.tsx"), "utf8")
const eventsPage = readFileSync(resolve(process.cwd(), "app/events/page.tsx"), "utf8")
const introductionPage = readFileSync(resolve(process.cwd(), "app/introduction/page.tsx"), "utf8")
const organizationPage = readFileSync(resolve(process.cwd(), "app/introduction/page.tsx"), "utf8")
const privacyPage = readFileSync(resolve(process.cwd(), "app/privacy/page.tsx"), "utf8")
const eventLayout = readFileSync(resolve(process.cwd(), "app/events/[slug]/layout.tsx"), "utf8")
const profileLayout = readFileSync(resolve(process.cwd(), "app/profile/[id]/layout.tsx"), "utf8")
const announcementDetailPage = readFileSync(resolve(process.cwd(), "app/announcement/[id]/page.tsx"), "utf8")
const announcementDetailArticleClient = readFileSync(resolve(process.cwd(), "app/announcement/[id]/article-client.tsx"), "utf8")
const eventAnnouncementDetailPage = readFileSync(
  resolve(process.cwd(), "app/events/[slug]/announcements/[id]/page.tsx"),
  "utf8"
)
const eventPage = readFileSync(resolve(process.cwd(), "app/events/[slug]/page.tsx"), "utf8")
const eventRecruitmentDetailPage = readFileSync(
  resolve(process.cwd(), "app/events/[slug]/recruitment/[id]/page.tsx"),
  "utf8"
)
const eventResultDetailPage = readFileSync(
  resolve(process.cwd(), "app/events/[slug]/results/[id]/page.tsx"),
  "utf8"
)

describe("metadata contracts", () => {
  test("root metadata defines metadataBase and open graph defaults", () => {
    assert.ok(rootLayout.includes("metadataBase: new URL("))
    assert.ok(rootLayout.includes("openGraph:"))
  })

  test("major public list pages define canonical and open graph metadata", () => {
    for (const content of [
      homePage,
      announcementPage,
      eventsPage,
      introductionPage,
      organizationPage,
      privacyPage,
    ]) {
      assert.ok(content.includes("alternates:"))
      assert.ok(content.includes("canonical:"))
      assert.ok(content.includes("openGraph:"))
    }
  })

  test("public detail metadata generators include alternates and open graph metadata", () => {
    for (const content of [
      eventLayout,
      profileLayout,
      announcementDetailPage,
      eventAnnouncementDetailPage,
      eventResultDetailPage,
    ]) {
      assert.ok(content.includes("alternates:"))
      assert.ok(content.includes("canonical:"))
      assert.ok(content.includes("openGraph:"))
    }
  })

  test("global recruitment route is removed from public metadata surfaces", () => {
    assert.ok(!existsSync(resolve(process.cwd(), "app/recruitment/page.tsx")))
    assert.ok(!existsSync(resolve(process.cwd(), "app/recruitment/[id]/page.tsx")))
  })

  test("public pages render the expected structured data types", () => {
    assert.ok(homePage.includes('"@type": "Organization"'))
    assert.ok(announcementPage.includes('"@type": "ItemList"'))
    assert.ok(eventsPage.includes('"@type": "ItemList"'))
    assert.ok(profileLayout.includes('"@type": "Person"'))
    // NewsArticle JSON-LD lives in the announcement article client (the
    // detail page now hands off to the inline view+edit client).
    assert.ok(announcementDetailArticleClient.includes('"@type": "NewsArticle"'))
    assert.ok(eventPage.includes('"@type": "Event"'))
    assert.ok(eventRecruitmentDetailPage.includes('"@type": "JobPosting"'))
  })
})
