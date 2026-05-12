import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { getOAuthMetadata } from "@/lib/auth/oauth-metadata";
import { getProtectedResourceMetadata } from "@/lib/auth/protected-resource-metadata";

describe("getOAuthMetadata", () => {
  test("returns authorization server metadata for MCP OAuth clients", () => {
    const baseUrl = "https://mcp.ai.winlab.tw";

    assert.deepStrictEqual(getOAuthMetadata(baseUrl), {
      issuer: baseUrl,
      authorization_endpoint: `${baseUrl}/oauth/authorize`,
      token_endpoint: `${baseUrl}/oauth/token`,
      registration_endpoint: `${baseUrl}/oauth/register`,
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      code_challenge_methods_supported: ["S256"],
      token_endpoint_auth_methods_supported: ["none"],
    });
  });
});

describe("getProtectedResourceMetadata", () => {
  test("returns MCP protected resource metadata with the authorization server", () => {
    const baseUrl = "https://mcp.ai.winlab.tw";

    assert.deepStrictEqual(getProtectedResourceMetadata(baseUrl), {
      resource: `${baseUrl}/mcp`,
      authorization_servers: [baseUrl],
      bearer_methods_supported: ["header"],
    });
  });
});
