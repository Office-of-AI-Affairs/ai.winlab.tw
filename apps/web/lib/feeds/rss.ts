import { escapeXml } from "./xml";

export type RssItemInput = {
  title: string;
  /** Absolute URL — RSS readers resolve relative URLs inconsistently. */
  url: string;
  /** Absolute, stable identifier. Callers pass the same value as `url` for
   *  a permalink guid, or a separate opaque id if the URL can change. */
  guid: string;
  guidIsPermaLink: boolean;
  pubDate: Date;
  category?: string;
  description?: string;
};

export type RssChannelInput = {
  title: string;
  /** Absolute URL of the human-readable page this feed describes. */
  link: string;
  description: string;
  /** BCP-47-ish language tag, e.g. `zh-TW` or `en-US`. */
  language: string;
  /** Absolute URL of the feed itself, for the `atom:link rel="self"`. */
  selfUrl: string;
  items: RssItemInput[];
};

/**
 * Build an RSS 2.0 document (with the `atom:link rel="self"` extension).
 * Pure and deterministic given `now` — no I/O, no locale/timezone
 * ambiguity (`pubDate`/`lastBuildDate` always render via `toUTCString()`,
 * which is RFC 1123 — a valid RFC 822 `pubDate`).
 */
export function buildRssFeed(channel: RssChannelInput, now: Date = new Date()): string {
  const itemsXml = channel.items
    .map((item) => {
      const description = item.description
        ? `\n      <description>${escapeXml(item.description)}</description>`
        : "";
      const category = item.category
        ? `\n      <category>${escapeXml(item.category)}</category>`
        : "";
      return `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(item.url)}</link>
      <guid isPermaLink="${item.guidIsPermaLink ? "true" : "false"}">${escapeXml(item.guid)}</guid>
      <pubDate>${item.pubDate.toUTCString()}</pubDate>${category}${description}
    </item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(channel.title)}</title>
    <link>${escapeXml(channel.link)}</link>
    <description>${escapeXml(channel.description)}</description>
    <language>${escapeXml(channel.language)}</language>
    <atom:link href="${escapeXml(channel.selfUrl)}" rel="self" type="application/rss+xml"/>
    <lastBuildDate>${now.toUTCString()}</lastBuildDate>
${itemsXml}
  </channel>
</rss>`;
}
