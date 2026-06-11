import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";

import { fetchPublicImage, readBodyCapped } from "./images";

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

function redirectTo(location: string): Response {
  return new Response(null, { status: 302, headers: { location } });
}

function stubFetch(responders: ((url: string) => Response)[]) {
  let i = 0;
  globalThis.fetch = (async (input: string | URL) => {
    const url = typeof input === "string" ? input : input.toString();
    const responder = responders[Math.min(i, responders.length - 1)];
    i += 1;
    return responder(url);
  }) as typeof fetch;
}

describe("fetchPublicImage", () => {
  test("re-validates redirect targets and rejects a hop into a private IP", async () => {
    stubFetch([() => redirectTo("http://169.254.169.254/latest/meta-data/")]);
    await assert.rejects(
      fetchPublicImage("https://images.example.com/pic.jpg"),
      /private IP/,
    );
  });

  test("rejects a redirect into an internal host", async () => {
    stubFetch([() => redirectTo("http://db.internal/secret")]);
    await assert.rejects(
      fetchPublicImage("https://images.example.com/pic.jpg"),
      /internal host/,
    );
  });

  test("follows a redirect to a public host and returns the final response", async () => {
    stubFetch([
      () => redirectTo("https://cdn.example.org/real.jpg"),
      () => new Response("ok", { status: 200 }),
    ]);
    const res = await fetchPublicImage("https://images.example.com/pic.jpg");
    assert.equal(res.status, 200);
  });

  test("aborts on a redirect loop", async () => {
    stubFetch([() => redirectTo("https://a.example.com/again")]);
    await assert.rejects(fetchPublicImage("https://a.example.com/start"), /too many redirects/);
  });
});

describe("readBodyCapped", () => {
  test("returns the body when within the cap", async () => {
    const out = await readBodyCapped(new Response(new Uint8Array(10)), 100);
    assert.equal(out.byteLength, 10);
  });

  test("throws when the body exceeds the cap", async () => {
    await assert.rejects(
      readBodyCapped(new Response(new Uint8Array(200)), 100),
      /size limit/,
    );
  });
});
