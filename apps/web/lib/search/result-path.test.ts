import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { searchResultPath } from "@/lib/search/result-path";
import type { SearchResultRow } from "@/lib/search/types";

function row(overrides: Partial<SearchResultRow>): SearchResultRow {
  return {
    type: "announcement",
    id: "id",
    slug: null,
    event_slug: null,
    title: "title",
    snippet: null,
    rank: 1,
    ...overrides,
  };
}

describe("searchResultPath", () => {
  test("global announcement (no event) routes on slug", () => {
    assert.equal(
      searchResultPath(row({ type: "announcement", slug: "AI-論壇" })),
      "/announcement/AI-%E8%AB%96%E5%A3%87",
    );
  });

  test("event-scoped announcement routes under /events/[slug]/announcements/[slug]", () => {
    assert.equal(
      searchResultPath(row({ type: "announcement", slug: "kickoff", event_slug: "rising-star" })),
      "/events/rising-star/announcements/kickoff",
    );
  });

  test("event routes on its own slug", () => {
    assert.equal(searchResultPath(row({ type: "event", slug: "rising-star" })), "/events/rising-star");
  });

  test("result routes under /events/[slug]/results/[id]", () => {
    assert.equal(
      searchResultPath(row({ type: "result", id: "result-1", event_slug: "rising-star" })),
      "/events/rising-star/results/result-1",
    );
  });

  test("result with no event_slug falls back to /events instead of a broken link", () => {
    assert.equal(searchResultPath(row({ type: "result", id: "orphan" })), "/events");
  });
});
