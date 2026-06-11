import assert from "node:assert/strict"
import { describe, test } from "node:test"

import { safeNextPath } from "./route"

const ORIGIN = "https://ai.winlab.tw"

describe("safeNextPath", () => {
  test("keeps internal relative paths", () => {
    assert.equal(safeNextPath("/account", ORIGIN), "/account")
    assert.equal(safeNextPath("/events/x?tab=results#a", ORIGIN), "/events/x?tab=results#a")
    assert.equal(safeNextPath("/", ORIGIN), "/")
  })

  test("rejects cross-origin redirect smuggling", () => {
    assert.equal(safeNextPath("//evil.com", ORIGIN), "/")
    assert.equal(safeNextPath("https://evil.com/cb", ORIGIN), "/")
    assert.equal(safeNextPath("/\\evil.com", ORIGIN), "/")
    assert.equal(safeNextPath("https://ai.winlab.tw.evil.com", ORIGIN), "/")
  })

  test("@-userinfo trick cannot move the host off-origin", () => {
    // resolves to https://ai.winlab.tw/@evil.com (an internal path), never to evil.com
    const out = safeNextPath("@evil.com", ORIGIN)
    assert.equal(new URL(out, ORIGIN).origin, ORIGIN)
  })
})
