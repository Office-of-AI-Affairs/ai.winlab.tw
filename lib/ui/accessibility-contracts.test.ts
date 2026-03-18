import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, test } from "node:test"

const rootLayout = readFileSync(resolve(process.cwd(), "app/layout.tsx"), "utf8")
const organizationClient = readFileSync(resolve(process.cwd(), "app/organization/client.tsx"), "utf8")
const announcementTable = readFileSync(resolve(process.cwd(), "components/announcement-table.tsx"), "utf8")
const announcementClient = readFileSync(resolve(process.cwd(), "app/announcement/client.tsx"), "utf8")
const homeAnnouncementTable = readFileSync(resolve(process.cwd(), "components/home-announcement-table.tsx"), "utf8")

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
    assert.ok(announcementClient.includes("getHref={(item) =>"))
    assert.ok(homeAnnouncementTable.includes("getHref={(item) =>"))
  })
})
