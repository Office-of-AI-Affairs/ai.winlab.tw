import assert from "node:assert/strict"
import { describe, test } from "node:test"

import {
  getApplicationMethodLinks,
  normalizeApplicationMethod,
} from "@/lib/recruitment-application-method"
import type { ApplicationMethod } from "@/lib/supabase/types"

describe("getApplicationMethodLinks", () => {
  test("returns sanitized named links from the new links array", () => {
    const applicationMethod: ApplicationMethod = {
      links: [
        { label: " 104 ", url: " https://www.104.com.tw/company/5ucjyv4 " },
        { label: "", url: "https://invalid.example.com" },
        { label: "Facebook", url: "" },
      ],
    }

    assert.deepEqual(getApplicationMethodLinks(applicationMethod), [
      {
        label: "104",
        url: "https://www.104.com.tw/company/5ucjyv4",
      },
    ])
  })

  test("falls back to the legacy single url field", () => {
    assert.deepEqual(
      getApplicationMethodLinks({
        url: " https://www.instagram.com/jumbo4fun ",
      }),
      [
        {
          label: "網站",
          url: "https://www.instagram.com/jumbo4fun",
        },
      ]
    )
  })

  test("includes the legacy recruitment link when normalizing all recruitment links", () => {
    assert.deepEqual(
      getApplicationMethodLinks(
        {
          links: [
            { label: "104", url: "https://www.104.com.tw/company/5ucjyv4" },
          ],
        },
        " https://www.jumbogames.com.tw "
      ),
      [
        {
          label: "104",
          url: "https://www.104.com.tw/company/5ucjyv4",
        },
        {
          label: "官方網站",
          url: "https://www.jumbogames.com.tw",
        },
      ]
    )
  })
})

describe("normalizeApplicationMethod", () => {
  test("promotes the legacy url field into a named link for form editing", () => {
    assert.deepEqual(
      normalizeApplicationMethod({
        email: " hr@example.com ",
        url: " https://www.jumbogames.com.tw ",
        other: " 請註明來源 ",
      }),
      {
        email: "hr@example.com",
        links: [
          {
            label: "網站",
            url: "https://www.jumbogames.com.tw",
          },
        ],
        other: "請註明來源",
      }
    )
  })

  test("merges the legacy recruitment link into named links for form editing", () => {
    assert.deepEqual(
      normalizeApplicationMethod(
        {
          email: "hr@example.com",
          links: [{ label: "104", url: "https://www.104.com.tw/company/5ucjyv4" }],
        },
        " https://www.jumbogames.com.tw "
      ),
      {
        email: "hr@example.com",
        links: [
          { label: "104", url: "https://www.104.com.tw/company/5ucjyv4" },
          { label: "官方網站", url: "https://www.jumbogames.com.tw" },
        ],
      }
    )
  })
})
