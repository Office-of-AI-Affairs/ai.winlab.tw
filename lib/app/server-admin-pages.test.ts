import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, test } from "node:test"

const carouselPage = readFileSync(resolve(process.cwd(), "app/carousel/page.tsx"), "utf8")
const contactsPage = readFileSync(resolve(process.cwd(), "app/contacts/page.tsx"), "utf8")
const settingsUsersPage = readFileSync(resolve(process.cwd(), "app/settings/users/page.tsx"), "utf8")
const homeOrganization = readFileSync(resolve(process.cwd(), "components/home-organization.tsx"), "utf8")
const announcementPage = readFileSync(resolve(process.cwd(), "app/announcement/page.tsx"), "utf8")
const eventsPage = readFileSync(resolve(process.cwd(), "app/events/page.tsx"), "utf8")
const eventDetailPage = readFileSync(resolve(process.cwd(), "app/events/[slug]/page.tsx"), "utf8")
const organizationPage = readFileSync(resolve(process.cwd(), "app/introduction/page.tsx"), "utf8")
const settingsPage = readFileSync(resolve(process.cwd(), "app/settings/page.tsx"), "utf8")
const announcementEditPage = readFileSync(resolve(process.cwd(), "app/announcement/[id]/edit/page.tsx"), "utf8")
const eventEditPage = readFileSync(resolve(process.cwd(), "app/events/[slug]/edit/page.tsx"), "utf8")
const contactEditPage = readFileSync(resolve(process.cwd(), "app/contacts/[id]/edit/page.tsx"), "utf8")
const privacyEditPage = readFileSync(resolve(process.cwd(), "app/privacy/edit/page.tsx"), "utf8")
const introductionEditPage = readFileSync(resolve(process.cwd(), "app/introduction/edit/page.tsx"), "utf8")
const carouselEditPage = readFileSync(resolve(process.cwd(), "app/carousel/[id]/edit/page.tsx"), "utf8")
const organizationEditPage = readFileSync(resolve(process.cwd(), "app/introduction/[id]/edit/page.tsx"), "utf8")
const eventAnnouncementEditPage = readFileSync(resolve(process.cwd(), "app/events/[slug]/announcements/[id]/edit/page.tsx"), "utf8")
const resultEditPage = readFileSync(resolve(process.cwd(), "app/events/[slug]/results/[id]/edit/page.tsx"), "utf8")
const rootLayout = readFileSync(resolve(process.cwd(), "app/layout.tsx"), "utf8")
const homePage = readFileSync(resolve(process.cwd(), "app/page.tsx"), "utf8")
const homeCarousel = readFileSync(resolve(process.cwd(), "components/home-carousel.tsx"), "utf8")
const homeContacts = readFileSync(resolve(process.cwd(), "components/home-contacts.tsx"), "utf8")
const authProvider = readFileSync(resolve(process.cwd(), "components/auth-provider.tsx"), "utf8")
const contactEditClient = readFileSync(resolve(process.cwd(), "app/contacts/[id]/edit/client.tsx"), "utf8")
const introductionEditClient = readFileSync(resolve(process.cwd(), "app/introduction/edit/client.tsx"), "utf8")
const carouselEditClient = readFileSync(resolve(process.cwd(), "app/carousel/[id]/edit/client.tsx"), "utf8")
const organizationEditClient = readFileSync(resolve(process.cwd(), "app/introduction/[id]/edit/client.tsx"), "utf8")
const eventAnnouncementEditClient = readFileSync(resolve(process.cwd(), "app/events/[slug]/announcements/[id]/edit/client.tsx"), "utf8")
const privacyEditClient = readFileSync(resolve(process.cwd(), "app/privacy/edit/client.tsx"), "utf8")
const resultEditClient = readFileSync(resolve(process.cwd(), "app/events/[slug]/results/[id]/edit/client.tsx"), "utf8")

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

  test("global recruitment route is removed in favor of event-scoped recruitment", () => {
    assert.ok(!existsSync(resolve(process.cwd(), "app/recruitment/page.tsx")))
    assert.ok(!existsSync(resolve(process.cwd(), "app/recruitment/client.tsx")))
  })

  test("shared viewer helper exists and is used by server pages that branch on role", () => {
    // Pages excluded from this list have moved to cookieless cached fetchers
    // (see "statically cached public pages" test below). Anything still
    // branching on role server-side must keep using getViewer().
    assert.ok(existsSync(resolve(process.cwd(), "lib/supabase/get-viewer.ts")))
    for (const content of [eventsPage, eventDetailPage, settingsPage]) {
      assert.ok(content.includes('from "@/lib/supabase/get-viewer"'))
      assert.ok(content.includes("getViewer(") || content.includes("await getViewer("))
      assert.ok(!content.includes('.from("profiles").select("role")'))
    }
  })

  test("statically cached public pages fetch via cookieless cached helpers", () => {
    // Contract: pages that can safely render the same HTML for every visitor
    // fetch from app/<route>/data.ts helpers wrapped in unstable_cache,
    // using createPublicClient — never getViewer(). Admin-only UI hydrates
    // client-side inside the matching client component.
    const cases = [
      { page: organizationPage, route: "introduction", tags: ["introduction", "organization-members"] },
      { page: announcementPage, route: "announcement", tags: ["announcements-published"] },
    ]
    for (const { page, route, tags } of cases) {
      assert.ok(!page.includes('from "@/lib/supabase/get-viewer"'))
      assert.ok(!page.includes("getViewer("))
      assert.ok(page.includes('from "./data"'))

      const data = readFileSync(resolve(process.cwd(), `app/${route}/data.ts`), "utf8")
      assert.ok(data.includes('from "next/cache"'))
      assert.ok(data.includes("unstable_cache"))
      assert.ok(data.includes('from "@/lib/supabase/public"'))
      for (const tag of tags) {
        assert.ok(data.includes(`tags: ["${tag}"]`), `${route}/data.ts must declare tag ${tag}`)
      }
    }
  })

  test("announcement and event edit routes are server-gated wrappers around client editors", () => {
    for (const content of [announcementEditPage, eventEditPage]) {
      assert.ok(!content.includes('"use client"'))
      assert.ok(content.includes('from "@/lib/supabase/require-admin-server"'))
      assert.ok(content.includes('from "./client"'))
      assert.ok(!content.includes("useAuth("))
      assert.ok(!content.includes("useEffect("))
    }
    assert.ok(existsSync(resolve(process.cwd(), "app/announcement/[id]/edit/client.tsx")))
    assert.ok(existsSync(resolve(process.cwd(), "app/events/[slug]/edit/client.tsx")))
  })

  test("remaining admin edit routes are server-gated wrappers around client editors", () => {
    for (const content of [
      contactEditPage,
      privacyEditPage,
      introductionEditPage,
      carouselEditPage,
      organizationEditPage,
      eventAnnouncementEditPage,
    ]) {
      assert.ok(!content.includes('"use client"'))
      assert.ok(content.includes('from "@/lib/supabase/require-admin-server"'))
      assert.ok(content.includes('from "./client"'))
      assert.ok(!content.includes("useAuth("))
      assert.ok(!content.includes("useEffect("))
    }
    assert.ok(existsSync(resolve(process.cwd(), "app/contacts/[id]/edit/client.tsx")))
    assert.ok(existsSync(resolve(process.cwd(), "app/privacy/edit/client.tsx")))
    assert.ok(existsSync(resolve(process.cwd(), "app/introduction/edit/client.tsx")))
    assert.ok(existsSync(resolve(process.cwd(), "app/carousel/[id]/edit/client.tsx")))
    assert.ok(existsSync(resolve(process.cwd(), "app/introduction/[id]/edit/client.tsx")))
    assert.ok(existsSync(resolve(process.cwd(), "app/events/[slug]/announcements/[id]/edit/client.tsx")))
  })

  test("result edit route is server-gated before the client editor mounts", () => {
    assert.ok(!resultEditPage.includes('"use client"'))
    assert.ok(resultEditPage.includes('from "@/lib/supabase/get-viewer"'))
    assert.ok(resultEditPage.includes('from "./client"'))
    assert.ok(!resultEditPage.includes("useAuth("))
    assert.ok(existsSync(resolve(process.cwd(), "app/events/[slug]/results/[id]/edit/client.tsx")))
  })

  test("root layout stays cookieless so downstream pages can SSG/ISR", () => {
    // Layout must not read cookies / auth — otherwise every page gets poisoned
    // into dynamic rendering. AuthProvider hydrates from the browser Supabase
    // client instead.
    assert.ok(rootLayout.includes("<AuthProvider"))
    assert.ok(!rootLayout.includes('from "@/lib/supabase/server"'))
    assert.ok(!rootLayout.includes("auth.getUser()"))
    assert.ok(!rootLayout.includes("initialUser={"))
    assert.ok(!rootLayout.includes("initialProfile={"))

    // AuthProvider still supports seeded props (optional) for anywhere that
    // wants to hand-off a pre-fetched user — layout just doesn't use them.
    assert.ok(authProvider.includes("initialUser?: User | null"))
    assert.ok(authProvider.includes("initialProfile?: Profile | null"))
  })

  test("homepage reads viewer state once and passes admin state down to sections", () => {
    assert.ok(homePage.includes('from "@/lib/supabase/get-viewer"'))
    assert.ok(homePage.includes("await getViewer()"))
    assert.ok(homePage.includes("isAdmin={isAdmin}"))
    assert.ok(!homeCarousel.includes('from "@/lib/supabase/get-viewer"'))
    assert.ok(!homeContacts.includes('from "@/lib/supabase/get-viewer"'))
    assert.ok(!homeCarousel.includes("getViewer("))
    assert.ok(!homeContacts.includes("getViewer("))
  })

  test("server-wrapped admin editors do not keep depending on useAuth in the client layer", () => {
    for (const content of [
      contactEditClient,
      privacyEditClient,
      introductionEditClient,
      carouselEditClient,
      organizationEditClient,
      eventAnnouncementEditClient,
      resultEditClient,
    ]) {
      assert.ok(!content.includes('from "@/components/auth-provider"'))
      assert.ok(!content.includes("useAuth("))
      assert.ok(!content.includes("authLoading"))
    }
  })
})
