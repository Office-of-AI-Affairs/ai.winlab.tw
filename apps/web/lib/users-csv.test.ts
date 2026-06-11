import assert from "node:assert/strict"
import { describe, test } from "node:test"

import { buildUsersCsv, parseUsersCsv } from "./users-csv"

describe("parseUsersCsv", () => {
  test("parses simple name and email rows", () => {
    assert.deepEqual(
      parseUsersCsv("name,email\nAlice,alice@example.com\nBob,bob@example.com"),
      [
        { name: "Alice", email: "alice@example.com" },
        { name: "Bob", email: "bob@example.com" },
      ]
    )
  })

  test("handles quoted commas, escaped quotes, and CRLF", () => {
    assert.deepEqual(
      parseUsersCsv('name,email\r\n"Lin, Alice","alice@example.com"\r\n"Bob ""The Lab""","bob@example.com"'),
      [
        { name: "Lin, Alice", email: "alice@example.com" },
        { name: 'Bob "The Lab"', email: "bob@example.com" },
      ]
    )
  })

  test("handles quoted newlines inside a cell", () => {
    assert.deepEqual(
      parseUsersCsv('name,email\n"Dr.\nAlice",alice@example.com'),
      [{ name: "Dr.\nAlice", email: "alice@example.com" }]
    )
  })
})

describe("buildUsersCsv", () => {
  test("quotes exported values and formats the filename date", () => {
    const result = buildUsersCsv(
      [
        {
          created_at: "2026-03-18T10:20:30.000Z",
          display_name: 'Alice "A"',
          email: "alice@example.com",
          role: "admin",
        },
      ],
      new Date("2026-03-18T10:20:30.000Z")
    )

    assert.equal(result.filename, "users-2026-03-18.csv")
    assert.equal(
      result.csv,
      '"name","email","role","joined"\n"Alice ""A""","alice@example.com","admin","2026-03-18"'
    )
  })

  test("disarms formula-injection in cells that start with = + - @", () => {
    const result = buildUsersCsv(
      [
        {
          created_at: "2026-03-18T10:20:30.000Z",
          display_name: '=HYPERLINK("http://evil","x")',
          email: "victim@example.com",
          role: "user",
        },
      ],
      new Date("2026-03-18T10:20:30.000Z")
    )

    const cell = result.csv.split("\n")[1].split(",")[0]
    // leading single quote inside the quoted cell neutralizes the formula
    assert.match(cell, /^"'=HYPERLINK/)
  })
})
