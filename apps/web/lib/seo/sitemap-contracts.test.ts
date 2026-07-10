import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, test } from "node:test"

const sitemapFile = readFileSync(resolve(process.cwd(), "app/sitemap.ts"), "utf8")
const homePage = readFileSync(resolve(process.cwd(), "app/[locale]/page.tsx"), "utf8")
const announcementPage = readFileSync(resolve(process.cwd(), "app/[locale]/announcement/page.tsx"), "utf8")
const eventsPage = readFileSync(resolve(process.cwd(), "app/[locale]/events/page.tsx"), "utf8")
const insightsPage = readFileSync(resolve(process.cwd(), "app/[locale]/insights/page.tsx"), "utf8")
const introductionPage = readFileSync(resolve(process.cwd(), "app/[locale]/introduction/page.tsx"), "utf8")
const organizationPage = readFileSync(resolve(process.cwd(), "app/[locale]/introduction/page.tsx"), "utf8")
const profileLayout = readFileSync(resolve(process.cwd(), "app/[locale]/profile/[id]/layout.tsx"), "utf8")
const eventLayout = readFileSync(resolve(process.cwd(), "app/[locale]/events/[slug]/layout.tsx"), "utf8")
const eventResultPage = readFileSync(
  resolve(process.cwd(), "app/[locale]/events/[slug]/results/[id]/page.tsx"),
  "utf8"
)

describe("sitemap contracts", () => {
  test("sitemap no longer emits legacy /result routes", () => {
    assert.ok(!sitemapFile.includes('url: `${BASE_URL}/result/${r.id}`'))
  })

  test("sitemap includes public profile, announcement, and event result routes, but not team routes", () => {
    // profile routes: only authors with published personal results are included
    assert.ok(sitemapFile.includes('.from("results")'))
    assert.ok(sitemapFile.includes('author_id'))
    assert.ok(sitemapFile.includes('`${BASE_URL}/profile/${'))
    assert.ok(sitemapFile.includes('.from("announcements")'))
    assert.ok(sitemapFile.includes('url: announcement.event_id && eventSlugMap[announcement.event_id]'))
    assert.ok(sitemapFile.includes('`${BASE_URL}/events/${eventSlugMap[announcement.event_id]}/announcements/${announcement.id}`'))
    assert.ok(sitemapFile.includes('url: `${BASE_URL}/events/${eventSlugMap[result.event_id!]}/results/${result.id}`'))
    assert.ok(!sitemapFile.includes('url: `${BASE_URL}/recruitment`'))
    assert.ok(!sitemapFile.includes('url: `${BASE_URL}/team/${team.id}`'))
  })

  test("sitemap includes published insight listing and detail routes", () => {
    assert.ok(sitemapFile.includes('url: `${BASE_URL}/insights`'))
    assert.ok(sitemapFile.includes('.from("articles")'))
    assert.ok(sitemapFile.includes('.eq("status", "published")'))
    assert.ok(sitemapFile.includes('url: `${BASE_URL}/insights/${article.id}`'))
    assert.ok(sitemapFile.includes('article.published_at ?? article.updated_at ?? article.created_at'))
  })
})

describe("metadata contracts", () => {
  test("major public pages define metadata", () => {
    // Locale-aware pages define metadata via generateMetadata (needed to emit
    // per-locale canonical + hreflang alternates); static `export const metadata`
    // is still accepted for pages that don't vary by locale.
    const definesMetadata = (src: string) =>
      src.includes("export const metadata") || src.includes("generateMetadata")
    assert.ok(definesMetadata(homePage))
    assert.ok(definesMetadata(announcementPage))
    assert.ok(definesMetadata(eventsPage))
    assert.ok(definesMetadata(insightsPage))
    assert.ok(definesMetadata(introductionPage))
    assert.ok(definesMetadata(organizationPage))
  })

  test("public detail pages describe the entity in metadata", () => {
    assert.ok(profileLayout.includes("description:") || profileLayout.includes("const description ="))
    assert.ok(eventLayout.includes("description:") || eventLayout.includes("const description ="))
    assert.ok(
      eventResultPage.includes("description:") ||
        eventResultPage.includes("const description =")
    )
  })

  test("event result pages no longer link publisher metadata to removed team pages", () => {
    assert.ok(!eventResultPage.includes("href: `/team/${result.team_id}`"))
  })
})
