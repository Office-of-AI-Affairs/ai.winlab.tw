import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { isExcludedPath, normalizeBeaconEvent } from "@/lib/analytics/schema";

describe("normalizeBeaconEvent — pageview", () => {
  test("normalizes a minimal valid pageview", () => {
    const event = normalizeBeaconEvent({ type: "pageview", path: "/events" });
    assert.deepEqual(event, { type: "pageview", path: "/events" });
  });

  test("strips query and hash from path", () => {
    const event = normalizeBeaconEvent({
      type: "pageview",
      path: "/events?utm_source=x#section",
    });
    assert.equal(event?.type, "pageview");
    assert.equal((event as { path: string }).path, "/events");
  });

  test("drops unknown keys instead of forwarding them", () => {
    const event = normalizeBeaconEvent({
      type: "pageview",
      path: "/",
      cookie: "session=abc",
      user_id: "123",
    });
    assert.deepEqual(event, { type: "pageview", path: "/" });
  });

  test("reduces referrer to origin only, dropping path/query", () => {
    const event = normalizeBeaconEvent({
      type: "pageview",
      path: "/",
      referrer: "https://www.google.com/search?q=ai+winlab",
    });
    assert.equal(event?.type, "pageview");
    assert.equal((event as { referrerOrigin?: string }).referrerOrigin, "https://www.google.com");
  });

  test("drops a malformed referrer without dropping the whole event", () => {
    const event = normalizeBeaconEvent({ type: "pageview", path: "/", referrer: "not a url" });
    assert.equal(event?.type, "pageview");
    assert.equal((event as { referrerOrigin?: string }).referrerOrigin, undefined);
  });

  test("keeps whitelisted utm params and clamps overlong values", () => {
    const long = "x".repeat(200);
    const event = normalizeBeaconEvent({
      type: "pageview",
      path: "/",
      utm_source: "newsletter",
      utm_medium: "email",
      utm_campaign: long,
    }) as { utmSource?: string; utmMedium?: string; utmCampaign?: string };

    assert.equal(event.utmSource, "newsletter");
    assert.equal(event.utmMedium, "email");
    assert.equal(event.utmCampaign?.length, 64);
  });

  test("accepts only known locales", () => {
    const ok = normalizeBeaconEvent({ type: "pageview", path: "/", locale: "en" }) as {
      locale?: string;
    };
    assert.equal(ok.locale, "en");

    const rejected = normalizeBeaconEvent({ type: "pageview", path: "/", locale: "fr" }) as {
      locale?: string;
    };
    assert.equal(rejected.locale, undefined);
  });

  test("accepts only known viewport buckets", () => {
    const ok = normalizeBeaconEvent({ type: "pageview", path: "/", viewport: "mobile" }) as {
      viewport?: string;
    };
    assert.equal(ok.viewport, "mobile");

    const rejected = normalizeBeaconEvent({ type: "pageview", path: "/", viewport: "tv" }) as {
      viewport?: string;
    };
    assert.equal(rejected.viewport, undefined);
  });

  test("drops pageviews missing a path", () => {
    assert.equal(normalizeBeaconEvent({ type: "pageview" }), null);
  });

  test("drops pageviews for admin/edit surfaces even if a client sends one", () => {
    assert.equal(normalizeBeaconEvent({ type: "pageview", path: "/settings" }), null);
    assert.equal(normalizeBeaconEvent({ type: "pageview", path: "/settings/users" }), null);
    assert.equal(normalizeBeaconEvent({ type: "pageview", path: "/login" }), null);
    assert.equal(normalizeBeaconEvent({ type: "pageview", path: "/en/settings" }), null);
  });
});

describe("normalizeBeaconEvent — webvital", () => {
  test("normalizes a minimal valid webvital", () => {
    const event = normalizeBeaconEvent({
      type: "webvital",
      name: "LCP",
      value: 1234.5,
      rating: "good",
      path: "/",
    });
    assert.deepEqual(event, { type: "webvital", name: "LCP", value: 1234.5, path: "/", rating: "good" });
  });

  test("rejects an unknown metric name", () => {
    assert.equal(
      normalizeBeaconEvent({ type: "webvital", name: "FID", value: 10, path: "/" }),
      null,
    );
  });

  test("rejects a non-finite or negative value", () => {
    assert.equal(
      normalizeBeaconEvent({ type: "webvital", name: "CLS", value: Number.NaN, path: "/" }),
      null,
    );
    assert.equal(
      normalizeBeaconEvent({ type: "webvital", name: "CLS", value: -1, path: "/" }),
      null,
    );
  });

  test("clamps an absurdly large value rather than dropping it", () => {
    const event = normalizeBeaconEvent({
      type: "webvital",
      name: "TTFB",
      value: Number.MAX_SAFE_INTEGER,
      path: "/",
    }) as { value: number };
    assert.equal(event.value, 1_000_000);
  });

  test("drops an unrecognized rating but keeps the rest of the event", () => {
    const event = normalizeBeaconEvent({
      type: "webvital",
      name: "INP",
      value: 42,
      rating: "amazing",
      path: "/",
    }) as { rating?: string };
    assert.equal(event.rating, undefined);
  });

  test("requires a path", () => {
    assert.equal(normalizeBeaconEvent({ type: "webvital", name: "FCP", value: 1 }), null);
  });
});

describe("normalizeBeaconEvent — garbage input", () => {
  test("rejects non-object, unknown-type, and malformed payloads", () => {
    assert.equal(normalizeBeaconEvent(null), null);
    assert.equal(normalizeBeaconEvent(undefined), null);
    assert.equal(normalizeBeaconEvent("pageview"), null);
    assert.equal(normalizeBeaconEvent(42), null);
    assert.equal(normalizeBeaconEvent([]), null);
    assert.equal(normalizeBeaconEvent({}), null);
    assert.equal(normalizeBeaconEvent({ type: "click" }), null);
  });
});

describe("isExcludedPath", () => {
  test("matches admin/edit route prefixes", () => {
    assert.equal(isExcludedPath("/settings"), true);
    assert.equal(isExcludedPath("/settings/users"), true);
    assert.equal(isExcludedPath("/login"), true);
  });

  test("locale-prefix aware", () => {
    assert.equal(isExcludedPath("/en/settings"), true);
    assert.equal(isExcludedPath("/en/login"), true);
  });

  test("catches ?mode=edit via the optional search argument", () => {
    assert.equal(isExcludedPath("/privacy", "?mode=edit"), true);
    assert.equal(isExcludedPath("/privacy", "?mode=view"), false);
  });

  test("does not flag ordinary visitor routes", () => {
    assert.equal(isExcludedPath("/"), false);
    assert.equal(isExcludedPath("/events/some-event"), false);
    assert.equal(isExcludedPath("/en/events"), false);
  });
});
