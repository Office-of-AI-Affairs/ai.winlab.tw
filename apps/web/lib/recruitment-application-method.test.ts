import assert from "node:assert/strict"
import { describe, test } from "node:test"

import {
  LEGACY_APPLICATION_LINK_LABEL,
  LEGACY_RECRUITMENT_LINK_LABEL,
  getApplicationMethodLinks,
  localizeApplicationLinkLabel,
  normalizeApplicationMethod,
} from "@/lib/recruitment-application-method"
import type { ApplicationMethod } from "@winlab/db"

const EN_LINK_LABELS = {
  applicationWebsite: "Website",
  recruitmentWebsite: "Official website",
}

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

describe("localizeApplicationLinkLabel", () => {
  test("maps legacy Chinese labels to the active locale", () => {
    assert.equal(
      localizeApplicationLinkLabel(LEGACY_RECRUITMENT_LINK_LABEL, EN_LINK_LABELS),
      "Official website",
    )
    assert.equal(
      localizeApplicationLinkLabel(LEGACY_APPLICATION_LINK_LABEL, EN_LINK_LABELS),
      "Website",
    )
  })

  test("passes user-authored labels through unchanged", () => {
    assert.equal(localizeApplicationLinkLabel("104", EN_LINK_LABELS), "104")
    assert.equal(localizeApplicationLinkLabel("Facebook", EN_LINK_LABELS), "Facebook")
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
