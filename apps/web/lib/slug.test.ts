import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { isUuid, nextSlugCandidate, normalizeSlugBase, toAnnouncementSlugBase } from "@/lib/slug";

describe("normalizeSlugBase", () => {
  test("trims outer whitespace", () => {
    assert.equal(normalizeSlugBase("  hello world  "), "hello-world");
  });

  test("collapses internal whitespace runs to a single hyphen", () => {
    assert.equal(normalizeSlugBase("hello   world\tagain"), "hello-world-again");
  });

  test("keeps CJK characters as-is", () => {
    assert.equal(normalizeSlugBase("AI 論壇：報名開始"), "AI-論壇：報名開始");
  });

  test("strips URL-hostile punctuation", () => {
    assert.equal(normalizeSlugBase(`a/b?c#d%e&f+g=h"i'j<k>l`), "abcdefghijkl");
  });

  test("strips the full-width space without leaving a hyphen", () => {
    assert.equal(normalizeSlugBase("公告　最新消息"), "公告最新消息");
  });

  test("re-trims stray hyphens left behind after stripping", () => {
    assert.equal(normalizeSlugBase("/leading and trailing/"), "leading-and-trailing");
  });

  test("returns empty string for all-punctuation input", () => {
    assert.equal(normalizeSlugBase("???"), "");
  });
});

describe("toAnnouncementSlugBase", () => {
  test("falls back to a generic base when normalization empties the title", () => {
    assert.equal(toAnnouncementSlugBase("???"), "announcement");
  });

  test("passes through a normal title unchanged", () => {
    assert.equal(toAnnouncementSlugBase("期中考公告"), "期中考公告");
  });
});

describe("nextSlugCandidate", () => {
  test("returns the bare base when it's free", () => {
    assert.equal(nextSlugCandidate("hello", new Set()), "hello");
  });

  test("first duplicate becomes -2, not -1", () => {
    assert.equal(nextSlugCandidate("hello", new Set(["hello"])), "hello-2");
  });

  test("skips over already-taken numeric suffixes", () => {
    assert.equal(
      nextSlugCandidate("hello", new Set(["hello", "hello-2", "hello-3"])),
      "hello-4",
    );
  });
});

describe("isUuid", () => {
  test("accepts a canonical UUID", () => {
    assert.ok(isUuid("7d6f6c01-fd15-403a-89dc-d6cf7af5a0ab"));
  });

  test("accepts uppercase UUIDs", () => {
    assert.ok(isUuid("7D6F6C01-FD15-403A-89DC-D6CF7AF5A0AB"));
  });

  test("rejects a slug", () => {
    assert.ok(!isUuid("期中考公告"));
    assert.ok(!isUuid("ai-rising-star-2"));
  });
});
