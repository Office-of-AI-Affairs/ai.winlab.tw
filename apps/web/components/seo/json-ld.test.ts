import assert from "node:assert/strict"
import { describe, test } from "node:test"

import { serializeJsonLd } from "./json-ld"

const LS = String.fromCharCode(0x2028)
const PS = String.fromCharCode(0x2029)

describe("serializeJsonLd", () => {
  test("escapes characters that could break out of a <script> block", () => {
    const out = serializeJsonLd({ name: "</script><script>alert(1)</script>" })
    assert.equal(out.includes("</script>"), false)
    assert.equal(out.includes("<"), false)
    assert.equal(out.includes(">"), false)
    assert.match(out, /\\u003c\/script\\u003e/)
  })

  test("escapes ampersand and line/paragraph separators", () => {
    const out = serializeJsonLd({ a: "x&y", b: `p${LS}q${PS}r` })
    assert.equal(out.includes("&"), false)
    assert.equal(out.includes(LS), false)
    assert.equal(out.includes(PS), false)
  })

  test("remains parseable JSON that round-trips the data", () => {
    const data = { name: "</script>", n: 1, nested: { k: "a<b>c&d" } }
    assert.deepEqual(JSON.parse(serializeJsonLd(data)), data)
  })
})
