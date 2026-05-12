import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  getApplicationMethodLinks,
  normalizeApplicationMethod,
  resolveRecruitmentLink,
} from "@/lib/recruitment-links";
import type { ApplicationMethod } from "@/lib/supabase/types";

describe("getApplicationMethodLinks", () => {
  test("returns sanitized named links and keeps legacy url compatibility", () => {
    const applicationMethod: ApplicationMethod = {
      links: [{ label: " 104 ", url: " https://www.104.com.tw/company/5ucjyv4 " }],
      url: " https://www.instagram.com/jumbo4fun ",
    };

    assert.deepEqual(getApplicationMethodLinks(applicationMethod), [
      { label: "104", url: "https://www.104.com.tw/company/5ucjyv4" },
      { label: "網站", url: "https://www.instagram.com/jumbo4fun" },
    ]);
  });
});

describe("normalizeApplicationMethod", () => {
  test("promotes legacy fields into the new links shape", () => {
    assert.deepEqual(
      normalizeApplicationMethod({
        email: " hr@example.com ",
        url: " https://www.jumbogames.com.tw ",
        other: " 請註明來源 ",
      }),
      {
        email: "hr@example.com",
        links: [{ label: "網站", url: "https://www.jumbogames.com.tw" }],
        other: "請註明來源",
      },
    );
  });
});

describe("resolveRecruitmentLink", () => {
  test("prefers the explicit top-level link when provided", () => {
    assert.equal(
      resolveRecruitmentLink(" https://example.com/company ", {
        links: [{ label: "104", url: "https://www.104.com.tw/company/5ucjyv4" }],
      }),
      "https://example.com/company",
    );
  });

  test("falls back to the first normalized application link", () => {
    assert.equal(
      resolveRecruitmentLink(undefined, {
        links: [{ label: "104", url: "https://www.104.com.tw/company/5ucjyv4" }],
      }),
      "https://www.104.com.tw/company/5ucjyv4",
    );
  });
});
