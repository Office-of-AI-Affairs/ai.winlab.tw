import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, test } from "node:test"

const rootLayout = readFileSync(resolve(process.cwd(), "app/layout.tsx"), "utf8")
const organizationClient = readFileSync(resolve(process.cwd(), "app/organization/client.tsx"), "utf8")

describe("accessibility contracts", () => {
  test("root layout provides a skip link and a main landmark", () => {
    assert.ok(rootLayout.includes('href="#main-content"'))
    assert.ok(rootLayout.includes('<main id="main-content"'))
  })

  test("organization page does not rely on window.open for member navigation", () => {
    assert.ok(!organizationClient.includes("window.open("))
    assert.ok(organizationClient.includes("href={member.website!}"))
  })
})
