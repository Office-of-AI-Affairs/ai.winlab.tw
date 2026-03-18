import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, test } from "node:test"

const carouselPage = readFileSync(resolve(process.cwd(), "app/carousel/page.tsx"), "utf8")
const contactsPage = readFileSync(resolve(process.cwd(), "app/contacts/page.tsx"), "utf8")
const settingsUsersPage = readFileSync(resolve(process.cwd(), "app/settings/users/page.tsx"), "utf8")
const homeOrganization = readFileSync(resolve(process.cwd(), "components/home-organization.tsx"), "utf8")

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
})
