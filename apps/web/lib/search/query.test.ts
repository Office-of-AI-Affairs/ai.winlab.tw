import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { isSearchQueryValid, normalizeSearchQuery } from "@/lib/search/query";

describe("normalizeSearchQuery", () => {
  test("trims outer whitespace", () => {
    assert.equal(normalizeSearchQuery("  ai forum  "), "ai forum");
  });

  test("collapses internal whitespace runs to a single space", () => {
    assert.equal(normalizeSearchQuery("ai    forum\t\tagain"), "ai forum again");
  });

  test("passes CJK text through unchanged (aside from trimming)", () => {
    assert.equal(normalizeSearchQuery(" 人工智慧 論壇 "), "人工智慧 論壇");
  });
});

describe("isSearchQueryValid", () => {
  test("rejects empty input", () => {
    assert.equal(isSearchQueryValid(""), false);
  });

  test("rejects whitespace-only input", () => {
    assert.equal(isSearchQueryValid("   "), false);
  });

  test("rejects a single character", () => {
    assert.equal(isSearchQueryValid("a"), false);
    assert.equal(isSearchQueryValid("人"), false);
  });

  test("accepts two or more characters after normalization", () => {
    assert.equal(isSearchQueryValid("ai"), true);
    assert.equal(isSearchQueryValid("人工"), true);
    assert.equal(isSearchQueryValid(" a "), false);
    assert.equal(isSearchQueryValid(" ai "), true);
  });
});
