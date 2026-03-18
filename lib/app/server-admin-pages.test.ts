import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, test } from "node:test"

const carouselPage = readFileSync(resolve(process.cwd(), "app/carousel/page.tsx"), "utf8")
const contactsPage = readFileSync(resolve(process.cwd(), "app/contacts/page.tsx"), "utf8")
const settingsUsersPage = readFileSync(resolve(process.cwd(), "app/settings/users/page.tsx"), "utf8")
const homeOrganization = readFileSync(resolve(process.cwd(), "components/home-organization.tsx"), "utf8")
const recruitmentPage = readFileSync(resolve(process.cwd(), "app/recruitment/page.tsx"), "utf8")
const announcementPage = readFileSync(resolve(process.cwd(), "app/announcement/page.tsx"), "utf8")
const eventsPage = readFileSync(resolve(process.cwd(), "app/events/page.tsx"), "utf8")
const eventDetailPage = readFileSync(resolve(process.cwd(), "app/events/[slug]/page.tsx"), "utf8")
const organizationPage = readFileSync(resolve(process.cwd(), "app/organization/page.tsx"), "utf8")
const settingsPage = readFileSync(resolve(process.cwd(), "app/settings/page.tsx"), "utf8")

describe("server admin page contracts", () => {
  test("carousel, contacts, and settings users pages are server-gated", () => {
    for (const content of [carouselPage, contactsPage, settingsUsersPage]) {
      assert.ok(!content.includes('"use client"'))
      assert.ok(content.includes("requireAdminServer()"))
    }
  })

  test("dedicated admin guard helper and client components exist", () => {
    assert.ok(existsSync(resolve(process.cwd(), "lib/supabase/require-admin-server.ts")))
    assert.ok(existsSync(resolve(process.cwd(), "app/carousel/client.tsx")))
    assert.ok(existsSync(resolve(process.cwd(), "app/contacts/client.tsx")))
    assert.ok(existsSync(resolve(process.cwd(), "app/settings/users/client.tsx")))
  })

  test("home organization section is server-renderable instead of client-fetched", () => {
    assert.ok(!homeOrganization.includes('"use client"'))
    assert.ok(homeOrganization.includes('from "@/lib/supabase/server"'))
    assert.ok(!homeOrganization.includes('from "@/lib/supabase/client"'))
    assert.ok(!homeOrganization.includes("useEffect("))
    assert.ok(homeOrganization.includes("await createClient()"))
  })

  test("recruitment listing is server-renderable with a client island for admin actions", () => {
    assert.ok(!recruitmentPage.includes('"use client"'))
    assert.ok(recruitmentPage.includes('from "@/lib/supabase/server"'))
    assert.ok(!recruitmentPage.includes('from "@/lib/supabase/client"'))
    assert.ok(!recruitmentPage.includes("useEffect("))
    assert.ok(recruitmentPage.includes('from "./client"'))
    assert.ok(existsSync(resolve(process.cwd(), "app/recruitment/client.tsx")))
  })

  test("shared viewer helper exists and is used by server pages that branch on role", () => {
    assert.ok(existsSync(resolve(process.cwd(), "lib/supabase/get-viewer.ts")))
    for (const content of [announcementPage, eventsPage, eventDetailPage, organizationPage, settingsPage]) {
      assert.ok(content.includes('from "@/lib/supabase/get-viewer"'))
      assert.ok(content.includes("getViewer(") || content.includes("await getViewer("))
      assert.ok(!content.includes('.from("profiles").select("role")'))
    }
  })
})
