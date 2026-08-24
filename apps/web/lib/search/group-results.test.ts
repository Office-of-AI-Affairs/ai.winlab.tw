import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { countSearchResults, groupSearchResults } from "@/lib/search/group-results";
import type { SearchResultRow } from "@/lib/search/types";

function row(overrides: Partial<SearchResultRow>): SearchResultRow {
  return {
    type: "announcement",
    id: "id",
    slug: "slug",
    event_slug: null,
    title: "title",
    snippet: null,
    rank: 1,
    ...overrides,
  };
}

describe("groupSearchResults", () => {
  test("groups rows by type in announcement -> event -> result order", () => {
    const rows: SearchResultRow[] = [
      row({ type: "result", id: "r1" }),
      row({ type: "announcement", id: "a1" }),
      row({ type: "event", id: "e1" }),
      row({ type: "announcement", id: "a2" }),
    ];

    const groups = groupSearchResults(rows);

    assert.deepEqual(
      groups.map((g) => g.type),
      ["announcement", "event", "result"],
    );
    assert.deepEqual(groups[0].items.map((r) => r.id), ["a1", "a2"]);
    assert.deepEqual(groups[1].items.map((r) => r.id), ["e1"]);
    assert.deepEqual(groups[2].items.map((r) => r.id), ["r1"]);
  });

  test("preserves each row's relative order within its group (server rank order)", () => {
    const rows: SearchResultRow[] = [
      row({ type: "announcement", id: "high", rank: 0.9 }),
      row({ type: "announcement", id: "low", rank: 0.1 }),
    ];

    const [group] = groupSearchResults(rows);

    assert.deepEqual(group.items.map((r) => r.id), ["high", "low"]);
  });

  test("omits groups with no hits", () => {
    const rows: SearchResultRow[] = [row({ type: "event", id: "e1" })];

    const groups = groupSearchResults(rows);

    assert.deepEqual(groups.map((g) => g.type), ["event"]);
  });

  test("returns an empty array for no rows", () => {
    assert.deepEqual(groupSearchResults([]), []);
  });
});

describe("countSearchResults", () => {
  test("counts across all types", () => {
    const rows: SearchResultRow[] = [
      row({ type: "announcement", id: "a1" }),
      row({ type: "event", id: "e1" }),
    ];
    assert.equal(countSearchResults(rows), 2);
  });
});
