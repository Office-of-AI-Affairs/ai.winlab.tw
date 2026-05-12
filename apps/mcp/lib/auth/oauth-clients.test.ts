import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  createOAuthClientStore,
  getRedirectUriMatch,
  registerOAuthClient,
} from "@/lib/auth/oauth-clients";

describe("registerOAuthClient", () => {
  test("stores validated registration metadata with defaults", async () => {
    let insertedRow: {
      client_id: string;
      client_name: string;
      redirect_uris: string[];
      grant_types: string[];
      response_types: string[];
      token_endpoint_auth_method?: string;
      created_at?: string;
    } | null = null;

    const store = createOAuthClientStore({
      insert: async (row) => {
        insertedRow = row;
      },
      selectById: async () => null,
    });

    const result = await registerOAuthClient(
      {
        client_name: "Codex",
        redirect_uris: ["http://127.0.0.1:4000/callback"],
      },
      store,
    );

    assert.equal(result.client_name, "Codex");
    assert.deepStrictEqual(result.redirect_uris, ["http://127.0.0.1:4000/callback"]);
    assert.deepStrictEqual(result.grant_types, ["authorization_code", "refresh_token"]);
    assert.deepStrictEqual(result.response_types, ["code"]);
    assert.equal(result.token_endpoint_auth_method, "none");
    assert.equal(typeof result.client_id, "string");

    assert.deepStrictEqual(insertedRow, {
      client_id: result.client_id,
      client_name: "Codex",
      redirect_uris: ["http://127.0.0.1:4000/callback"],
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
      created_at: insertedRow!.created_at,
    });
  });

  test("rejects registration without redirect URIs", async () => {
    const store = createOAuthClientStore({
      insert: async () => {},
      selectById: async () => null,
    });

    await assert.rejects(
      () =>
        registerOAuthClient(
          {
            client_name: "Codex",
            redirect_uris: [],
          },
          store,
        ),
      /redirect_uris/,
    );
  });
});

describe("getRedirectUriMatch", () => {
  test("returns the matching redirect URI for a registered client", async () => {
    const store = createOAuthClientStore({
      insert: async () => {},
      selectById: async () => ({
        client_id: "client-123",
        client_name: "Codex",
        redirect_uris: [
          "http://127.0.0.1:4000/callback",
          "https://chat.openai.com/aip/callback",
        ],
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
        created_at: new Date().toISOString(),
      }),
    });

    assert.equal(
      await getRedirectUriMatch("client-123", "https://chat.openai.com/aip/callback", store),
      "https://chat.openai.com/aip/callback",
    );

    assert.equal(
      await getRedirectUriMatch("client-123", "https://example.com/callback", store),
      null,
    );
  });
});
