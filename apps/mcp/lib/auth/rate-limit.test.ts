import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { createRateLimiter, getClientIp, normalizeEmail } from "@/lib/auth/rate-limit";

describe("createRateLimiter", () => {
  test("allows attempts under the limit", () => {
    const limiter = createRateLimiter(1000, 3);
    const now = 0;

    limiter.recordFailure("a", now);
    limiter.recordFailure("a", now);

    assert.equal(limiter.isLimited("a", now), false);
  });

  test("blocks once the limit is reached and reports retry-after", () => {
    const limiter = createRateLimiter(1000, 3);
    const now = 0;

    limiter.recordFailure("a", now);
    limiter.recordFailure("a", now);
    limiter.recordFailure("a", now);

    assert.equal(limiter.isLimited("a", now), true);
    assert.equal(limiter.retryAfterSeconds("a", now), 1);
  });

  test("resets the window after it expires", () => {
    const limiter = createRateLimiter(1000, 2);

    limiter.recordFailure("a", 0);
    limiter.recordFailure("a", 0);
    assert.equal(limiter.isLimited("a", 0), true);

    // window has fully elapsed
    assert.equal(limiter.isLimited("a", 2000), false);
    limiter.recordFailure("a", 2000);
    assert.equal(limiter.isLimited("a", 2000), false);
  });

  test("reset() clears tracked failures for a key", () => {
    const limiter = createRateLimiter(1000, 1);

    limiter.recordFailure("a", 0);
    assert.equal(limiter.isLimited("a", 0), true);

    limiter.reset("a");
    assert.equal(limiter.isLimited("a", 0), false);
  });

  test("tracks keys independently", () => {
    const limiter = createRateLimiter(1000, 1);

    limiter.recordFailure("a", 0);
    assert.equal(limiter.isLimited("a", 0), true);
    assert.equal(limiter.isLimited("b", 0), false);
  });
});

describe("getClientIp", () => {
  test("prefers the first x-forwarded-for entry", () => {
    const request = new Request("https://example.com", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
    });

    assert.equal(getClientIp(request), "1.2.3.4");
  });

  test("falls back to x-real-ip", () => {
    const request = new Request("https://example.com", {
      headers: { "x-real-ip": "9.9.9.9" },
    });

    assert.equal(getClientIp(request), "9.9.9.9");
  });

  test("falls back to unknown when no headers present", () => {
    const request = new Request("https://example.com");

    assert.equal(getClientIp(request), "unknown");
  });
});

describe("normalizeEmail", () => {
  test("trims and lowercases", () => {
    assert.equal(normalizeEmail("  Foo@Example.COM  "), "foo@example.com");
  });
});
