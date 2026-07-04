import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { getClientAttributionAttributes } from "@/lib/otel/attribution";

describe("getClientAttributionAttributes", () => {
  test("extracts client.address from x-forwarded-for (first entry)", () => {
    const headers = new Headers({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" });
    assert.equal(getClientAttributionAttributes(headers)["client.address"], "1.2.3.4");
  });

  test("falls back to x-real-ip when x-forwarded-for is absent", () => {
    const headers = new Headers({ "x-real-ip": "9.9.9.9" });
    assert.equal(getClientAttributionAttributes(headers)["client.address"], "9.9.9.9");
  });

  test("extracts and decodes Vercel geo headers", () => {
    const headers = new Headers({
      "x-vercel-ip-country": "TW",
      "x-vercel-ip-city": "Hsinchu%20City",
      "x-vercel-ip-country-region": "HSZ",
    });
    const attributes = getClientAttributionAttributes(headers);

    assert.equal(attributes["geo.country"], "TW");
    assert.equal(attributes["geo.city"], "Hsinchu City");
    assert.equal(attributes["geo.region"], "HSZ");
  });

  test("keeps a malformed percent-encoded city as-is instead of throwing", () => {
    const headers = new Headers({ "x-vercel-ip-city": "%E0%A4%A" });
    assert.equal(getClientAttributionAttributes(headers)["geo.city"], "%E0%A4%A");
  });

  test("omits every key when no headers are present (local dev, no Vercel)", () => {
    const attributes = getClientAttributionAttributes(new Headers());
    assert.deepEqual(attributes, {});
  });

  test("also accepts a plain NodeJS.Dict header record (onRequestError shape)", () => {
    const attributes = getClientAttributionAttributes({
      "x-forwarded-for": "10.0.0.1",
      "x-vercel-ip-country": "US",
    });

    assert.equal(attributes["client.address"], "10.0.0.1");
    assert.equal(attributes["geo.country"], "US");
  });

  test("takes the first value of a multi-value header array", () => {
    const attributes = getClientAttributionAttributes({
      "x-forwarded-for": ["203.0.113.5", "198.51.100.9"],
    });

    assert.equal(attributes["client.address"], "203.0.113.5");
  });
});
