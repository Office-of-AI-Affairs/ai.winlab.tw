import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { verifyMcpToken } from "@/lib/auth/jwt";

describe("verifyMcpToken", () => {
  test("rejects malformed tokens", async () => {
    assert.equal(await verifyMcpToken("not-a-jwt"), null);
    assert.equal(await verifyMcpToken("only.two"), null);
    assert.equal(await verifyMcpToken(""), null);
  });

  test("rejects tokens not signed by the configured Supabase project", async () => {
    const fake =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLTEyMyIsImV4cCI6OTk5OTk5OTk5OX0." +
      "fake-signature";
    assert.equal(await verifyMcpToken(fake), null);
  });
});
