/**
 * Minimal RFC 5545 (iCalendar) builder — just enough for "here are some
 * all-day VEVENTs, publish them as a VCALENDAR". No recurrence, no
 * timezones (every date we have is a bare `date`, not a `timestamptz`),
 * no attendees.
 */

const CRLF = "\r\n";
const FOLD_LIMIT = 75;

/** Escape the characters RFC 5545 §3.3.11 requires escaping in TEXT
 *  values: backslash, semicolon, comma, and newline. */
export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

/**
 * Fold a content line at `FOLD_LIMIT` octets per RFC 5545 §3.1: continued
 * lines start with a single space. Splits on UTF-16 code units, which is
 * an approximation of "octets" for multi-byte (CJK) text — good enough to
 * keep long lines from breaking naive line-oriented parsers, which is the
 * actual risk this guards against.
 */
export function foldIcsLine(line: string): string {
  if (line.length <= FOLD_LIMIT) return line;

  const chunks: string[] = [line.slice(0, FOLD_LIMIT)];
  let rest = line.slice(FOLD_LIMIT);
  while (rest.length > 0) {
    // Continuation lines start with a space, which counts against the
    // limit, so each subsequent chunk is one shorter.
    chunks.push(rest.slice(0, FOLD_LIMIT - 1));
    rest = rest.slice(FOLD_LIMIT - 1);
  }
  return chunks.join(`${CRLF} `);
}

/** UTC instant as `YYYYMMDDTHHMMSSZ` (RFC 5545 DATE-TIME, UTC form). */
export function toIcsDateTimeUtc(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

/** Calendar date (no time component) as `YYYYMMDD` (RFC 5545 DATE), taken
 *  from the UTC representation of `date` so it's stable regardless of the
 *  server's local timezone. */
export function toIcsDate(date: Date): string {
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}

/** `toIcsDate` shifted forward one day — the DTEND convention for an
 *  all-day event is exclusive (RFC 5545 §3.6.1). */
export function toIcsDateNextDay(date: Date): string {
  const next = new Date(date.getTime() + 24 * 60 * 60 * 1000);
  return toIcsDate(next);
}

export type IcsEventInput = {
  /** Stable, globally-unique id — combined with a domain for UID. */
  uid: string;
  summary: string;
  description?: string;
  url?: string;
  /** All-day event start (no time-of-day data available — see callers). */
  startDate: Date;
  /** When the ics document/entry was generated. */
  createdAt: Date;
};

function buildVEvent(event: IcsEventInput): string {
  const lines = [
    "BEGIN:VEVENT",
    `UID:${escapeIcsText(event.uid)}`,
    `DTSTAMP:${toIcsDateTimeUtc(event.createdAt)}`,
    `DTSTART;VALUE=DATE:${toIcsDate(event.startDate)}`,
    `DTEND;VALUE=DATE:${toIcsDateNextDay(event.startDate)}`,
    `SUMMARY:${escapeIcsText(event.summary)}`,
  ];
  if (event.description) lines.push(`DESCRIPTION:${escapeIcsText(event.description)}`);
  if (event.url) lines.push(`URL:${escapeIcsText(event.url)}`);
  lines.push("END:VEVENT");
  return lines.map(foldIcsLine).join(CRLF);
}

export type IcsCalendarInput = {
  calendarName: string;
  events: IcsEventInput[];
};

/** Build a full `VCALENDAR` document — one or more `VEVENT`s, CRLF line
 *  endings throughout (required by RFC 5545 §3.1, not just LF). */
export function buildIcsCalendar(calendar: IcsCalendarInput): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//NYCU Office of AI Affairs//ai.winlab.tw//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    foldIcsLine(`X-WR-CALNAME:${escapeIcsText(calendar.calendarName)}`),
    ...calendar.events.map(buildVEvent),
    "END:VCALENDAR",
  ];
  return lines.join(CRLF) + CRLF;
}
