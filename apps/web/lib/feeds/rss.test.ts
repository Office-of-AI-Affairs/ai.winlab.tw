import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { buildRssFeed, type RssChannelInput } from "@/lib/feeds/rss";
import { isWellFormedXml } from "@/lib/feeds/xml";

const NOW = new Date("2026-08-24T12:00:00Z");

function channel(overrides: Partial<RssChannelInput> = {}): RssChannelInput {
  return {
    title: "公告",
    link: "https://ai.winlab.tw/announcement",
    description: "公告 feed",
    language: "zh-TW",
    selfUrl: "https://ai.winlab.tw/announcement/rss.xml",
    items: [
      {
        title: "AI 論壇 <公告>",
        url: "https://ai.winlab.tw/announcement/ai-forum",
        guid: "https://ai.winlab.tw/announcement/ai-forum",
        guidIsPermaLink: true,
        pubDate: new Date("2026-08-20T00:00:00Z"),
        category: "一般",
      },
    ],
    ...overrides,
  };
}

describe("buildRssFeed", () => {
  test("produces well-formed XML", () => {
    const xml = buildRssFeed(channel(), NOW);
    assert.equal(isWellFormedXml(xml), true);
  });

  test("escapes item titles containing XML-significant characters", () => {
    const xml = buildRssFeed(channel(), NOW);
    assert.ok(xml.includes("AI 論壇 &lt;公告&gt;"));
    assert.ok(!xml.includes("<公告>"));
  });

  test("pubDate renders as an RFC 822 / 1123 date-time", () => {
    const xml = buildRssFeed(channel(), NOW);
    const match = xml.match(/<pubDate>([^<]+)<\/pubDate>/);
    assert.ok(match, "expected a <pubDate> element");
    assert.match(match![1], /^\w{3}, \d{2} \w{3} \d{4} \d{2}:\d{2}:\d{2} GMT$/);
  });

  test("lastBuildDate uses the injected `now`, not wall-clock time", () => {
    const xml = buildRssFeed(channel(), NOW);
    assert.ok(xml.includes(`<lastBuildDate>${NOW.toUTCString()}</lastBuildDate>`));
  });

  test("item links and the atom:link self href are absolute URLs", () => {
    const xml = buildRssFeed(channel(), NOW);
    const linkMatch = xml.match(/<link>([^<]+)<\/link>/);
    assert.ok(linkMatch![1].startsWith("https://"));
    assert.ok(xml.includes('href="https://ai.winlab.tw/announcement/rss.xml"'));
  });

  test("guid isPermaLink reflects the input flag", () => {
    const permalink = buildRssFeed(channel(), NOW);
    assert.ok(permalink.includes('isPermaLink="true"'));

    const opaque = buildRssFeed(
      channel({
        items: [
          {
            title: "x",
            url: "https://ai.winlab.tw/x",
            guid: "opaque-id-1",
            guidIsPermaLink: false,
            pubDate: NOW,
          },
        ],
      }),
      NOW,
    );
    assert.ok(opaque.includes('isPermaLink="false"'));
    assert.ok(opaque.includes(">opaque-id-1<"));
  });

  test("omits category/description elements when not provided", () => {
    const xml = buildRssFeed(
      channel({
        items: [
          {
            title: "no extras",
            url: "https://ai.winlab.tw/x",
            guid: "https://ai.winlab.tw/x",
            guidIsPermaLink: true,
            pubDate: NOW,
          },
        ],
      }),
      NOW,
    );
    assert.ok(!xml.includes("<category>"));
    assert.ok(!xml.includes("<description>no extras"));
  });

  test("renders zero items as a valid empty channel", () => {
    const xml = buildRssFeed(channel({ items: [] }), NOW);
    assert.equal(isWellFormedXml(xml), true);
    assert.ok(xml.includes("<channel>"));
  });
});
