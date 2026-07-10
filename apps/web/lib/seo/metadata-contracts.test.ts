import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, test } from "node:test"

const rootLayout = readFileSync(resolve(process.cwd(), "app/[locale]/layout.tsx"), "utf8")
const homePage = readFileSync(resolve(process.cwd(), "app/[locale]/page.tsx"), "utf8")
const announcementPage = readFileSync(resolve(process.cwd(), "app/[locale]/announcement/page.tsx"), "utf8")
const eventsPage = readFileSync(resolve(process.cwd(), "app/[locale]/events/page.tsx"), "utf8")
const introductionPage = readFileSync(resolve(process.cwd(), "app/[locale]/introduction/page.tsx"), "utf8")
const organizationPage = readFileSync(resolve(process.cwd(), "app/[locale]/introduction/page.tsx"), "utf8")
const privacyPage = readFileSync(resolve(process.cwd(), "app/[locale]/privacy/page.tsx"), "utf8")
const eventLayout = readFileSync(resolve(process.cwd(), "app/[locale]/events/[slug]/layout.tsx"), "utf8")
const profileLayout = readFileSync(resolve(process.cwd(), "app/[locale]/profile/[id]/layout.tsx"), "utf8")
const announcementDetailPage = readFileSync(resolve(process.cwd(), "app/[locale]/announcement/[id]/page.tsx"), "utf8")
const announcementDetailArticleClient = readFileSync(resolve(process.cwd(), "components/announcement-article-client.tsx"), "utf8")
const eventAnnouncementDetailPage = readFileSync(
  resolve(process.cwd(), "app/[locale]/events/[slug]/announcements/[id]/page.tsx"),
  "utf8"
)
const eventPage = readFileSync(resolve(process.cwd(), "app/[locale]/events/[slug]/page.tsx"), "utf8")
const eventAnnouncementsListingPage = readFileSync(
  resolve(process.cwd(), "app/[locale]/events/[slug]/announcements/page.tsx"),
  "utf8"
)
const eventResultsListingPage = readFileSync(
  resolve(process.cwd(), "app/[locale]/events/[slug]/results/page.tsx"),
  "utf8"
)
const eventRecruitmentListingPage = readFileSync(
  resolve(process.cwd(), "app/[locale]/events/[slug]/recruitment/page.tsx"),
  "utf8"
)
const eventRecruitmentDetailPage = readFileSync(
  resolve(process.cwd(), "app/[locale]/events/[slug]/recruitment/[id]/page.tsx"),
  "utf8"
)
const eventResultDetailPage = readFileSync(
  resolve(process.cwd(), "app/[locale]/events/[slug]/results/[id]/page.tsx"),
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

  test("event tab listing pages each carry their own canonical + openGraph (issue #1)", () => {
    // Splitting /events/[slug] tabs into path-based routes means each
    // listing has to ship its own metadata — that's the whole reason for
    // the refactor.
    for (const [content, suffix] of [
      [eventAnnouncementsListingPage, "/announcements"],
      [eventResultsListingPage, "/results"],
      [eventRecruitmentListingPage, "/recruitment"],
    ] as const) {
      // Each tab ships its own canonical + hreflang via localeAlternates(),
      // fed the tab-specific bare path — that's what keeps issue #1 fixed.
      assert.ok(content.includes("alternates:"))
      assert.ok(content.includes(`localeAlternates(\`/events/\${slug}${suffix}\``))
      assert.ok(content.includes("openGraph:"))
      assert.ok(content.includes("url: a.canonical"))
    }
  })

  test("global recruitment route is removed from public metadata surfaces", () => {
    assert.ok(!existsSync(resolve(process.cwd(), "app/[locale]/recruitment/page.tsx")))
    assert.ok(!existsSync(resolve(process.cwd(), "app/[locale]/recruitment/[id]/page.tsx")))
  })

  test("public pages render the expected structured data types", () => {
    assert.ok(homePage.includes('"@type": "Organization"'))
    assert.ok(announcementPage.includes('"@type": "ItemList"'))
    assert.ok(eventsPage.includes('"@type": "ItemList"'))
    assert.ok(profileLayout.includes('"@type": "Person"'))
    // NewsArticle JSON-LD lives in the announcement article client (the
    // detail page now hands off to the inline view+edit client).
    assert.ok(announcementDetailArticleClient.includes('"@type": "NewsArticle"'))
    // Event JSON-LD moved from /events/[slug]/page.tsx (now a redirect) to
    // the parent layout so it's emitted on every tab listing (issue #1).
    assert.ok(eventLayout.includes('"@type": "Event"'))
    assert.ok(!eventPage.includes('"@type": "Event"'))
    assert.ok(eventRecruitmentDetailPage.includes('"@type": "JobPosting"'))
  })
})
