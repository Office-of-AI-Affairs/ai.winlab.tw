import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, test } from "node:test"

const sitemapFile = readFileSync(resolve(process.cwd(), "app/sitemap.ts"), "utf8")
const homePage = readFileSync(resolve(process.cwd(), "app/page.tsx"), "utf8")
const announcementPage = readFileSync(resolve(process.cwd(), "app/announcement/page.tsx"), "utf8")
const eventsPage = readFileSync(resolve(process.cwd(), "app/events/page.tsx"), "utf8")
const introductionPage = readFileSync(resolve(process.cwd(), "app/introduction/page.tsx"), "utf8")
const organizationPage = readFileSync(resolve(process.cwd(), "app/organization/page.tsx"), "utf8")
const profileLayout = readFileSync(resolve(process.cwd(), "app/profile/[id]/layout.tsx"), "utf8")
const eventLayout = readFileSync(resolve(process.cwd(), "app/events/[slug]/layout.tsx"), "utf8")
const eventResultPage = readFileSync(
  resolve(process.cwd(), "app/events/[slug]/results/[id]/page.tsx"),
  "utf8"
)

describe("sitemap contracts", () => {
  test("sitemap no longer emits legacy /result routes", () => {
    assert.ok(!sitemapFile.includes('url: `${BASE_URL}/result/${r.id}`'))
  })

  test("sitemap includes public profile, announcement, and event result routes, but not team routes", () => {
    assert.ok(sitemapFile.includes('.from("public_profiles")'))
    assert.ok(sitemapFile.includes('.from("announcements")'))
    assert.ok(sitemapFile.includes('.from("results")'))
    assert.ok(sitemapFile.includes('url: `${BASE_URL}/profile/${profile.id}`'))
    assert.ok(sitemapFile.includes('url: announcement.event_id && eventSlugMap[announcement.event_id]'))
    assert.ok(sitemapFile.includes('`${BASE_URL}/events/${eventSlugMap[announcement.event_id]}/announcements/${announcement.id}`'))
    assert.ok(sitemapFile.includes('url: `${BASE_URL}/events/${eventSlugMap[result.event_id!]}/results/${result.id}`'))
    assert.ok(!sitemapFile.includes('url: `${BASE_URL}/team/${team.id}`'))
  })
})

describe("metadata contracts", () => {
  test("major public pages define metadata", () => {
    assert.ok(homePage.includes("export const metadata"))
    assert.ok(announcementPage.includes("export const metadata"))
    assert.ok(eventsPage.includes("export const metadata"))
    assert.ok(introductionPage.includes("export const metadata"))
    assert.ok(organizationPage.includes("export const metadata"))
  })

  test("public detail pages describe the entity in metadata", () => {
    assert.ok(profileLayout.includes("description:"))
    assert.ok(eventLayout.includes("description:"))
    assert.ok(
      eventResultPage.includes("description:") ||
        eventResultPage.includes("const description =")
    )
  })

  test("event result pages no longer link publisher metadata to removed team pages", () => {
    assert.ok(!eventResultPage.includes("href: `/team/${result.team_id}`"))
  })
})
