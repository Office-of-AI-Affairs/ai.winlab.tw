import assert from "node:assert/strict";
import { test } from "node:test";
import { GET as getAuthorizationServerMetadata } from "@/app/.well-known/oauth-authorization-server/route";
import { GET as getProtectedResourceMetadata } from "@/app/.well-known/oauth-protected-resource/mcp/route";
import { POST as postMcp } from "@/app/mcp/route";
import {
  createOAuthClientStore,
  registerOAuthClient,
  type OAuthClientRow,
} from "@/lib/auth/oauth-clients";
import {
  parseAuthorizeRequest,
  parseTokenAuthorizationCodeRequest,
  validateOAuthClientRequest,
} from "@/lib/auth/oauth-request";

test("local smoke: discovery metadata and OAuth contract remain internally consistent", async () => {
  const authorizationServerMetadata = await getAuthorizationServerMetadata();
  const protectedResourceMetadata = await getProtectedResourceMetadata();
  const unauthorizedMcpResponse = await postMcp(
    new Request("https://mcp.ai.winlab.tw/mcp", { method: "POST" }),
  );

  const registeredClients = new Map<string, OAuthClientRow>();
  const store = createOAuthClientStore({
    insert: async (row) => {
      registeredClients.set(row.client_id, row);
    },
    selectById: async (clientId) => registeredClients.get(clientId) ?? null,
  });

  const client = await registerOAuthClient(
    {
      client_name: "Smoke Test Client",
      redirect_uris: ["http://127.0.0.1:4000/callback"],
    },
    store,
  );

  const authorizeRequest = parseAuthorizeRequest(
    new URLSearchParams({
      client_id: client.client_id,
      redirect_uri: "http://127.0.0.1:4000/callback",
      response_type: "code",
      code_challenge: "smoke-challenge",
      code_challenge_method: "S256",
      resource: "https://mcp.ai.winlab.tw/mcp",
      state: "smoke-state",
    }),
  );

  const tokenRequestForm = new FormData();
  tokenRequestForm.set("grant_type", "authorization_code");
  tokenRequestForm.set("code", "smoke-code");
  tokenRequestForm.set("code_verifier", "smoke-verifier");
  tokenRequestForm.set("client_id", client.client_id);
  tokenRequestForm.set("redirect_uri", "http://127.0.0.1:4000/callback");
  tokenRequestForm.set("resource", "https://mcp.ai.winlab.tw/mcp");

  const tokenRequest = parseTokenAuthorizationCodeRequest(tokenRequestForm);
  const validatedClient = await validateOAuthClientRequest(
    {
      clientId: authorizeRequest.clientId,
      redirectUri: authorizeRequest.redirectUri,
      resource: authorizeRequest.resource,
    },
    {
      expectedResource: "https://mcp.ai.winlab.tw/mcp",
      store,
    },
  );

  assert.deepStrictEqual(await authorizationServerMetadata.json(), {
    issuer: "https://mcp.ai.winlab.tw",
    authorization_endpoint: "https://mcp.ai.winlab.tw/oauth/authorize",
    token_endpoint: "https://mcp.ai.winlab.tw/oauth/token",
    registration_endpoint: "https://mcp.ai.winlab.tw/oauth/register",
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
  });
  assert.deepStrictEqual(await protectedResourceMetadata.json(), {
    resource: "https://mcp.ai.winlab.tw/mcp",
    authorization_servers: ["https://mcp.ai.winlab.tw"],
    bearer_methods_supported: ["header"],
  });
  assert.equal(unauthorizedMcpResponse.status, 401);
  assert.equal(
    unauthorizedMcpResponse.headers.get("WWW-Authenticate"),
    'Bearer resource_metadata="https://mcp.ai.winlab.tw/.well-known/oauth-protected-resource/mcp"',
  );
  assert.equal(validatedClient.client_id, client.client_id);
  assert.equal(tokenRequest.clientId, client.client_id);
  assert.equal(tokenRequest.resource, "https://mcp.ai.winlab.tw/mcp");
});
