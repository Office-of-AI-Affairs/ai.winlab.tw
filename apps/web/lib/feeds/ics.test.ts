import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  buildIcsCalendar,
  escapeIcsText,
  foldIcsLine,
  toIcsDate,
  toIcsDateNextDay,
  toIcsDateTimeUtc,
  type IcsEventInput,
} from "@/lib/feeds/ics";

describe("escapeIcsText", () => {
  test("escapes backslash, semicolon, comma, and newlines", () => {
    assert.equal(escapeIcsText("a;b,c\\d\ne"), "a\\;b\\,c\\\\d\\ne");
  });

  test("leaves plain / CJK text untouched", () => {
    assert.equal(escapeIcsText("AI 論壇"), "AI 論壇");
  });
});

describe("foldIcsLine", () => {
  test("leaves short lines unfolded", () => {
    assert.equal(foldIcsLine("SUMMARY:short"), "SUMMARY:short");
  });

  test("folds lines longer than 75 chars with a CRLF + leading space", () => {
    const long = "SUMMARY:" + "a".repeat(100);
    const folded = foldIcsLine(long);
    assert.ok(folded.includes("\r\n "));
    // Reassembling (strip the fold marker) must round-trip to the original.
    assert.equal(folded.replace(/\r\n /g, ""), long);
  });
});

describe("toIcsDate / toIcsDateNextDay / toIcsDateTimeUtc", () => {
  test("toIcsDate renders YYYYMMDD in UTC", () => {
    assert.equal(toIcsDate(new Date("2026-08-24T23:30:00Z")), "20260824");
  });

  test("toIcsDateNextDay is exactly one day after toIcsDate", () => {
    const d = new Date("2026-08-24T00:00:00Z");
    assert.equal(toIcsDate(d), "20260824");
    assert.equal(toIcsDateNextDay(d), "20260825");
  });

  test("toIcsDateNextDay rolls over a month boundary", () => {
    assert.equal(toIcsDateNextDay(new Date("2026-08-31T00:00:00Z")), "20260901");
  });

  test("toIcsDateTimeUtc renders YYYYMMDDTHHMMSSZ", () => {
    assert.equal(toIcsDateTimeUtc(new Date("2026-08-24T12:34:56Z")), "20260824T123456Z");
  });
});

function event(overrides: Partial<IcsEventInput> = {}): IcsEventInput {
  return {
    uid: "event-1@ai.winlab.tw",
    summary: "AI Rising Star",
    startDate: new Date("2026-09-01T00:00:00Z"),
    createdAt: new Date("2026-08-24T00:00:00Z"),
    ...overrides,
  };
}

describe("buildIcsCalendar", () => {
  test("wraps VEVENTs in a VCALENDAR with CRLF line endings", () => {
    const ics = buildIcsCalendar({ calendarName: "活動", events: [event()] });
    assert.ok(ics.startsWith("BEGIN:VCALENDAR\r\n"));
    assert.ok(ics.trimEnd().endsWith("END:VCALENDAR"));
    assert.ok(ics.includes("BEGIN:VEVENT\r\n"));
    assert.ok(ics.includes("END:VEVENT"));
    // No bare LF that isn't part of a CRLF pair.
    assert.ok(!/(?<!\r)\n/.test(ics));
  });

  test("renders an all-day event as DTSTART/DTEND VALUE=DATE, one day apart", () => {
    const ics = buildIcsCalendar({ calendarName: "活動", events: [event()] });
    assert.ok(ics.includes("DTSTART;VALUE=DATE:20260901"));
    assert.ok(ics.includes("DTEND;VALUE=DATE:20260902"));
  });

  test("includes DESCRIPTION and URL only when provided", () => {
    const withExtras = buildIcsCalendar({
      calendarName: "活動",
      events: [event({ description: "說明", url: "https://ai.winlab.tw/events/rising-star" })],
    });
    assert.ok(withExtras.includes("DESCRIPTION:說明"));
    assert.ok(withExtras.includes("URL:https://ai.winlab.tw/events/rising-star"));

    const withoutExtras = buildIcsCalendar({ calendarName: "活動", events: [event()] });
    assert.ok(!withoutExtras.includes("DESCRIPTION:"));
    assert.ok(!withoutExtras.includes("URL:"));
  });

  test("renders one VEVENT per input event, in order", () => {
    const ics = buildIcsCalendar({
      calendarName: "活動",
      events: [event({ uid: "a@ai.winlab.tw" }), event({ uid: "b@ai.winlab.tw" })],
    });
    const uids = [...ics.matchAll(/UID:([^\r\n]+)/g)].map((m) => m[1]);
    assert.deepEqual(uids, ["a@ai.winlab.tw", "b@ai.winlab.tw"]);
  });

  test("renders a calendar with zero events as a still-valid empty VCALENDAR", () => {
    const ics = buildIcsCalendar({ calendarName: "活動", events: [] });
    assert.ok(ics.includes("BEGIN:VCALENDAR"));
    assert.ok(ics.includes("END:VCALENDAR"));
    assert.ok(!ics.includes("BEGIN:VEVENT"));
  });
});
