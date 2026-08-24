import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  parseAnnouncementRevisionSnapshot,
  parseResultRevisionSnapshot,
} from "@/lib/revisions";

describe("parseAnnouncementRevisionSnapshot", () => {
  test("extracts the full editorial field set", () => {
    const snap = parseAnnouncementRevisionSnapshot({
      title: "標題",
      title_en: "Title",
      content: { type: "doc", content: [] },
      status: "draft",
      publish_at: "2026-09-01T00:00:00Z",
      category: "activity",
      date: "2026-08-24",
      unrelated_column: "should be ignored",
    });
    assert.deepEqual(snap, {
      title: "標題",
      title_en: "Title",
      content: { type: "doc", content: [] },
      status: "draft",
      publish_at: "2026-09-01T00:00:00Z",
      category: "activity",
      date: "2026-08-24",
    });
  });

  test("degrades every field to null on garbage input instead of throwing", () => {
    assert.deepEqual(parseAnnouncementRevisionSnapshot(null), {
      title: null,
      title_en: null,
      content: null,
      status: null,
      publish_at: null,
      category: null,
      date: null,
    });
    assert.deepEqual(parseAnnouncementRevisionSnapshot("not an object"), {
      title: null,
      title_en: null,
      content: null,
      status: null,
      publish_at: null,
      category: null,
      date: null,
    });
    assert.deepEqual(parseAnnouncementRevisionSnapshot([1, 2, 3]), {
      title: null,
      title_en: null,
      content: null,
      status: null,
      publish_at: null,
      category: null,
      date: null,
    });
  });

  test("wrong-typed fields become null rather than passing through", () => {
    const snap = parseAnnouncementRevisionSnapshot({ title: 123, content: "not an object" });
    assert.equal(snap.title, null);
    assert.equal(snap.content, null);
  });
});

describe("parseResultRevisionSnapshot", () => {
  test("extracts the results field set (no publish_at/category)", () => {
    const snap = parseResultRevisionSnapshot({
      title: "成果",
      title_en: null,
      content: { type: "doc" },
      status: "published",
      date: "2026-08-01",
    });
    assert.deepEqual(snap, {
      title: "成果",
      title_en: null,
      content: { type: "doc" },
      status: "published",
      date: "2026-08-01",
    });
  });
});
