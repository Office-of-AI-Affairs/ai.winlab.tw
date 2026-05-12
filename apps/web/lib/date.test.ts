import assert from "node:assert/strict"
import { describe, test } from "node:test"

import { formatDate } from "@/lib/date"

describe("formatDate", () => {
  test("formats short dates in zh-TW with Taipei timezone", () => {
    assert.equal(formatDate("2026-03-18T00:00:00Z"), "2026/03/18")
  })

  test("formats long dates in zh-TW with Taipei timezone", () => {
    assert.equal(formatDate("2026-03-18T00:00:00Z", "long"), "2026年3月18日")
  })

  test("normalizes UTC timestamps into Taipei local dates", () => {
    assert.equal(formatDate("2026-03-17T18:30:00Z"), "2026/03/18")
  })
})
