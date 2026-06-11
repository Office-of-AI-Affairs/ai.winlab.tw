import assert from "node:assert/strict"
import { describe, test } from "node:test"

import { safeHref } from "./safe-href"

describe("safeHref", () => {
  test("allows http and https, trimming surrounding whitespace", () => {
    assert.equal(safeHref("https://example.com/x"), "https://example.com/x")
    assert.equal(safeHref("  http://example.com  "), "http://example.com")
    assert.equal(safeHref("HTTPS://EXAMPLE.COM"), "HTTPS://EXAMPLE.COM")
  })

  test("rejects javascript: and other dangerous schemes", () => {
    assert.equal(safeHref("javascript:alert(1)"), null)
    assert.equal(safeHref("  javascript:alert(1)"), null)
    assert.equal(safeHref("data:text/html,<script>alert(1)</script>"), null)
    assert.equal(safeHref("vbscript:msgbox(1)"), null)
    assert.equal(safeHref("JavaScript:alert(1)"), null)
  })

  test("rejects relative paths, bare hosts, and empty input", () => {
    assert.equal(safeHref("/internal"), null)
    assert.equal(safeHref("example.com"), null)
    assert.equal(safeHref(""), null)
    assert.equal(safeHref("mailto:a@b.com"), null)
  })
})
