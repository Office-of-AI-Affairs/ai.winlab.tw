import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  fromDatetimeLocalValue,
  isLive,
  livePublishAtFilter,
  toDatetimeLocalValue,
} from "@/lib/scheduling";

describe("isLive", () => {
  const now = new Date("2026-08-24T12:00:00Z");

  test("draft is never live regardless of publish_at", () => {
    assert.equal(isLive({ status: "draft", publish_at: null }, now), false);
    assert.equal(
      isLive({ status: "draft", publish_at: "2020-01-01T00:00:00Z" }, now),
      false,
    );
  });

  test("published with no publish_at is live immediately", () => {
    assert.equal(isLive({ status: "published", publish_at: null }, now), true);
  });

  test("published with a past publish_at is live", () => {
    assert.equal(
      isLive({ status: "published", publish_at: "2026-08-24T11:59:59Z" }, now),
      true,
    );
  });

  test("published with a future publish_at is not live yet", () => {
    assert.equal(
      isLive({ status: "published", publish_at: "2026-08-24T12:00:01Z" }, now),
      false,
    );
  });

  test("published exactly at publish_at is live (inclusive)", () => {
    assert.equal(
      isLive({ status: "published", publish_at: "2026-08-24T12:00:00Z" }, now),
      true,
    );
  });

  test("an unparseable publish_at degrades to live (never hard-hides a published row)", () => {
    assert.equal(
      isLive({ status: "published", publish_at: "not-a-date" }, now),
      true,
    );
  });
});

describe("livePublishAtFilter", () => {
  test("produces a Supabase .or() filter string pinned to the given instant", () => {
    const now = new Date("2026-08-24T12:00:00.000Z");
    assert.equal(
      livePublishAtFilter(now),
      "publish_at.is.null,publish_at.lte.2026-08-24T12:00:00.000Z",
    );
  });
});

describe("datetime-local <-> ISO round trip", () => {
  test("empty/null input round-trips to empty string / null", () => {
    assert.equal(toDatetimeLocalValue(null), "");
    assert.equal(toDatetimeLocalValue(undefined), "");
    assert.equal(fromDatetimeLocalValue(""), null);
  });

  test("invalid ISO input degrades to empty string", () => {
    assert.equal(toDatetimeLocalValue("not-a-date"), "");
  });

  test("a datetime-local value round-trips through fromDatetimeLocalValue -> toDatetimeLocalValue", () => {
    const local = "2026-09-01T09:30";
    const iso = fromDatetimeLocalValue(local);
    assert.ok(iso);
    assert.equal(toDatetimeLocalValue(iso), local);
  });
});
