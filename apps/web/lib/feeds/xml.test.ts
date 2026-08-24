import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { escapeXml, isWellFormedXml } from "@/lib/feeds/xml";

describe("escapeXml", () => {
  test("escapes all five XML-significant characters", () => {
    assert.equal(escapeXml(`<a>&'"</a>`), "&lt;a&gt;&amp;&apos;&quot;&lt;/a&gt;");
  });

  test("leaves CJK and plain text untouched", () => {
    assert.equal(escapeXml("AI 論壇公告"), "AI 論壇公告");
  });

  test("is a no-op for a string with nothing to escape", () => {
    assert.equal(escapeXml("hello world"), "hello world");
  });
});

describe("isWellFormedXml", () => {
  test("accepts a simple well-nested document", () => {
    assert.equal(isWellFormedXml("<a><b>text</b></a>"), true);
  });

  test("accepts self-closing tags", () => {
    assert.equal(isWellFormedXml('<a><b href="x"/></a>'), true);
  });

  test("accepts an XML declaration and comments", () => {
    assert.equal(
      isWellFormedXml('<?xml version="1.0"?><!-- comment --><a></a>'),
      true,
    );
  });

  test("rejects mismatched closing tags", () => {
    assert.equal(isWellFormedXml("<a><b></a></b>"), false);
  });

  test("rejects an unclosed tag", () => {
    assert.equal(isWellFormedXml("<a><b></b>"), false);
  });

  test("rejects an extra closing tag", () => {
    assert.equal(isWellFormedXml("<a></a></a>"), false);
  });
});
