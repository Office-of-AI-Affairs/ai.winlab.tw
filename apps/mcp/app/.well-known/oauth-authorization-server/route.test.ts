import assert from "node:assert/strict";
import { test } from "node:test";
import { GET } from "@/app/.well-known/oauth-authorization-server/route";

test("GET /.well-known/oauth-authorization-server returns OAuth server metadata", async () => {
  const response = await GET();

  assert.equal(response.status, 200);
  assert.deepStrictEqual(await response.json(), {
    issuer: "https://mcp.ai.winlab.tw",
    authorization_endpoint: "https://mcp.ai.winlab.tw/oauth/authorize",
    token_endpoint: "https://mcp.ai.winlab.tw/oauth/token",
    registration_endpoint: "https://mcp.ai.winlab.tw/oauth/register",
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
  });
});
