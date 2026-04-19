import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, test } from "node:test"

const eventsPage = readFileSync(resolve(process.cwd(), "app/events/page.tsx"), "utf8")
const eventsData = readFileSync(resolve(process.cwd(), "app/events/data.ts"), "utf8")
const eventsClient = readFileSync(resolve(process.cwd(), "app/events/client.tsx"), "utf8")
const eventDetailPage = readFileSync(resolve(process.cwd(), "app/events/[slug]/page.tsx"), "utf8")

describe("events access contracts", () => {
  test("events index restricts drafts to admins", () => {
    // New architecture: the server-side page only loads published events via
    // a cookieless cached fetcher, so non-admin visitors physically cannot see
    // drafts regardless of any client code. Admin drafts are merged in on the
    // client — gated on useAuth().isAdmin and still bounded by RLS.
    assert.ok(eventsData.includes('.eq("status", "published")'))
    assert.ok(eventsPage.includes("getPublishedEvents()"))
    assert.ok(!eventsPage.includes("draft"))
    assert.ok(eventsClient.includes("const { isAdmin } = useAuth()"))
    assert.ok(eventsClient.includes('if (!isAdmin)'))
    assert.ok(eventsClient.includes('.eq("status", "draft")'))
  })

  test("event detail restricts event draft visibility to admins", () => {
    assert.ok(eventDetailPage.includes("if (!isAdmin) eventQuery.eq"))
    assert.ok(eventDetailPage.includes('eventQuery.eq("status", "published")'))
    assert.ok(!eventDetailPage.includes("if (!user) eventQuery.eq"))
  })
})
