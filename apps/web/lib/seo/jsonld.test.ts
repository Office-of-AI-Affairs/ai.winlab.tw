import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  buildBreadcrumbJsonLd,
  buildEventJsonLd,
  buildNewsArticleJsonLd,
  buildOrganizationJsonLd,
} from "@/lib/seo/jsonld";

describe("buildOrganizationJsonLd", () => {
  test("omits contactPoint when there's no email or phone", () => {
    const data = buildOrganizationJsonLd({ name: "Org" });
    assert.equal("contactPoint" in data, false);
  });

  test("includes contactPoint when an email is present", () => {
    const data = buildOrganizationJsonLd({
      name: "Org",
      contactPoint: { email: "hello@example.com" },
    });
    assert.deepEqual(data.contactPoint, {
      "@type": "ContactPoint",
      email: "hello@example.com",
    });
  });

  test("omits sameAs when empty, includes it when populated", () => {
    assert.equal("sameAs" in buildOrganizationJsonLd({ name: "Org", sameAs: [] }), false);
    const withLinks = buildOrganizationJsonLd({ name: "Org", sameAs: ["https://x.com/org"] });
    assert.deepEqual(withLinks.sameAs, ["https://x.com/org"]);
  });

  test("includes logo when provided", () => {
    const data = buildOrganizationJsonLd({ name: "Org", logo: "https://ai.winlab.tw/og.png" });
    assert.equal(data.logo, "https://ai.winlab.tw/og.png");
  });
});

describe("buildNewsArticleJsonLd", () => {
  test("author defaults to the publisher when no author is given", () => {
    const data = buildNewsArticleJsonLd({
      headline: "h",
      datePublished: "2026-01-01",
      url: "https://ai.winlab.tw/announcement/h",
      publisherName: "Office of AI Affairs",
    });
    assert.deepEqual(data.author, { "@type": "Organization", name: "Office of AI Affairs" });
  });

  test("omits image when not provided", () => {
    const data = buildNewsArticleJsonLd({
      headline: "h",
      datePublished: "2026-01-01",
      url: "https://ai.winlab.tw/announcement/h",
      publisherName: "Office of AI Affairs",
    });
    assert.equal("image" in data, false);
  });

  test("includes image when provided", () => {
    const data = buildNewsArticleJsonLd({
      headline: "h",
      datePublished: "2026-01-01",
      url: "https://ai.winlab.tw/announcement/h",
      publisherName: "Office of AI Affairs",
      image: "https://ai.winlab.tw/x.png",
    });
    assert.equal(data.image, "https://ai.winlab.tw/x.png");
  });
});

describe("buildEventJsonLd", () => {
  test("omits startDate/endDate when the data model has none", () => {
    const data = buildEventJsonLd({
      name: "e",
      description: "d",
      url: "https://ai.winlab.tw/events/e",
      organizerName: "Office of AI Affairs",
    });
    assert.equal("startDate" in data, false);
    assert.equal("endDate" in data, false);
  });

  test("includes dates when given", () => {
    const data = buildEventJsonLd({
      name: "e",
      description: "d",
      url: "https://ai.winlab.tw/events/e",
      organizerName: "Office of AI Affairs",
      startDate: "2026-01-01",
      endDate: "2026-01-02",
    });
    assert.equal(data.startDate, "2026-01-01");
    assert.equal(data.endDate, "2026-01-02");
  });
});

describe("buildBreadcrumbJsonLd (re-export)", () => {
  test("re-exports the same builder as ./breadcrumb", () => {
    const data = buildBreadcrumbJsonLd([{ name: "Home", path: "/" }]);
    assert.equal(data["@type"], "BreadcrumbList");
  });
});
