import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  parseAuthorizeRequest,
  parseTokenAuthorizationCodeRequest,
  validateOAuthClientRequest,
} from "@/lib/auth/oauth-request";
import { createOAuthClientStore } from "@/lib/auth/oauth-clients";

describe("parseAuthorizeRequest", () => {
  test("accepts valid authorization parameters including resource", () => {
    const result = parseAuthorizeRequest(
      new URLSearchParams({
        client_id: "client-123",
        redirect_uri: "http://127.0.0.1:4000/callback",
        response_type: "code",
        code_challenge: "challenge-123",
        code_challenge_method: "S256",
        resource: "https://mcp.ai.winlab.tw/mcp",
        state: "abc",
      }),
    );

    assert.deepStrictEqual(result, {
      clientId: "client-123",
      redirectUri: "http://127.0.0.1:4000/callback",
      responseType: "code",
      codeChallenge: "challenge-123",
      codeChallengeMethod: "S256",
      resource: "https://mcp.ai.winlab.tw/mcp",
      state: "abc",
    });
  });

  test("rejects unsupported PKCE methods", () => {
    assert.throws(() =>
      parseAuthorizeRequest(
        new URLSearchParams({
          client_id: "client-123",
          redirect_uri: "http://127.0.0.1:4000/callback",
          response_type: "code",
          code_challenge: "challenge-123",
          code_challenge_method: "plain",
        }),
      ),
    );
  });
});

describe("parseTokenAuthorizationCodeRequest", () => {
  test("requires code, verifier, and resource for the authorization code exchange", () => {
    const form = new FormData();
    form.set("grant_type", "authorization_code");
    form.set("code", "code-123");
    form.set("code_verifier", "verifier-123");
    form.set("client_id", "client-123");
    form.set("redirect_uri", "http://127.0.0.1:4000/callback");
    form.set("resource", "https://mcp.ai.winlab.tw/mcp");

    assert.deepStrictEqual(parseTokenAuthorizationCodeRequest(form), {
      code: "code-123",
      codeVerifier: "verifier-123",
      clientId: "client-123",
      redirectUri: "http://127.0.0.1:4000/callback",
      resource: "https://mcp.ai.winlab.tw/mcp",
    });
  });

  test("rejects missing code verifier", () => {
    const form = new FormData();
    form.set("grant_type", "authorization_code");
    form.set("code", "code-123");

    assert.throws(() => parseTokenAuthorizationCodeRequest(form));
  });

  test("accepts authorization code exchange when resource is omitted", () => {
    const form = new FormData();
    form.set("grant_type", "authorization_code");
    form.set("code", "code-123");
    form.set("code_verifier", "verifier-123");
    form.set("client_id", "client-123");
    form.set("redirect_uri", "http://127.0.0.1:4000/callback");

    assert.deepStrictEqual(parseTokenAuthorizationCodeRequest(form), {
      code: "code-123",
      codeVerifier: "verifier-123",
      clientId: "client-123",
      redirectUri: "http://127.0.0.1:4000/callback",
      resource: undefined,
    });
  });
});

describe("validateOAuthClientRequest", () => {
  test("accepts a registered redirect URI and canonical MCP resource", async () => {
    const store = createOAuthClientStore({
      insert: async () => {},
      selectById: async () => ({
        client_id: "client-123",
        client_name: "Codex",
        redirect_uris: ["http://127.0.0.1:4000/callback"],
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
        created_at: new Date().toISOString(),
      }),
    });

    const result = await validateOAuthClientRequest(
      {
        clientId: "client-123",
        redirectUri: "http://127.0.0.1:4000/callback",
        resource: "https://mcp.ai.winlab.tw/mcp",
      },
      {
        expectedResource: "https://mcp.ai.winlab.tw/mcp",
        store,
      },
    );

    assert.equal(result.client_id, "client-123");
  });

  test("rejects an unregistered redirect URI", async () => {
    const store = createOAuthClientStore({
      insert: async () => {},
      selectById: async () => ({
        client_id: "client-123",
        client_name: "Codex",
        redirect_uris: ["http://127.0.0.1:4000/callback"],
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
        created_at: new Date().toISOString(),
      }),
    });

    await assert.rejects(
      () =>
        validateOAuthClientRequest(
          {
            clientId: "client-123",
            redirectUri: "https://example.com/callback",
            resource: "https://mcp.ai.winlab.tw/mcp",
          },
          {
            expectedResource: "https://mcp.ai.winlab.tw/mcp",
            store,
          },
        ),
      /redirect_uri/,
    );
  });

  test("rejects a mismatched resource indicator", async () => {
    const store = createOAuthClientStore({
      insert: async () => {},
      selectById: async () => ({
        client_id: "client-123",
        client_name: "Codex",
        redirect_uris: ["http://127.0.0.1:4000/callback"],
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
        created_at: new Date().toISOString(),
      }),
    });

    await assert.rejects(
      () =>
        validateOAuthClientRequest(
          {
            clientId: "client-123",
            redirectUri: "http://127.0.0.1:4000/callback",
            resource: "https://example.com/mcp",
          },
          {
            expectedResource: "https://mcp.ai.winlab.tw/mcp",
            store,
          },
        ),
      /resource/,
    );
  });
});
