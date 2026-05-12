import assert from "node:assert/strict";
import { test } from "node:test";
import { GET } from "@/app/.well-known/oauth-protected-resource/mcp/route";

test("GET /.well-known/oauth-protected-resource/mcp returns MCP protected resource metadata", async () => {
  const response = await GET();

  assert.equal(response.status, 200);
  assert.deepStrictEqual(await response.json(), {
    resource: "https://mcp.ai.winlab.tw/mcp",
    authorization_servers: ["https://mcp.ai.winlab.tw"],
    bearer_methods_supported: ["header"],
  });
});
