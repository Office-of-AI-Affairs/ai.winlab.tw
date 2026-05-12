import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { createAuthCodeStore, type StoredAuthData } from "@/lib/auth/auth-codes";

const sampleData: StoredAuthData = {
  accessToken: "access-token",
  refreshToken: "refresh-token",
  expiresIn: 3600,
  codeChallenge: "challenge",
  redirectUri: "https://chat.openai.com/aip/callback",
  clientId: "client-123",
  resource: "https://mcp.ai.winlab.tw/mcp",
};

describe("createAuthCodeStore", () => {
  test("stores auth codes through the RPC layer", async () => {
    let calledWith: { p_code: string; p_data: StoredAuthData } | null = null;

    const store = createAuthCodeStore({
      rpc: async (_functionName, args) => {
        calledWith = args as { p_code: string; p_data: StoredAuthData };
        return { error: null };
      },
    });

    await store.insert("code-123", sampleData);

    assert.deepStrictEqual(calledWith, {
      p_code: "code-123",
      p_data: sampleData,
    });
  });

  test("returns exchanged auth code data through the RPC layer", async () => {
    const store = createAuthCodeStore({
      rpc: async () => ({ data: sampleData, error: null }),
    });

    const exchanged = await store.exchange("code-123");

    assert.deepStrictEqual(exchanged, sampleData);
  });

  test("surfaces RPC failures as explicit errors", async () => {
    const store = createAuthCodeStore({
      rpc: async (_functionName) => {
        if (_functionName === "create_oauth_auth_code") {
          return { error: { message: "insert failed" } };
        }

        return { data: null, error: { message: "exchange failed" } };
      },
    });

    await assert.rejects(() => store.insert("code-123", sampleData), /insert failed/);
    await assert.rejects(() => store.exchange("code-123"), /exchange failed/);
  });
});
