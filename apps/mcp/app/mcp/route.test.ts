import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { POST } from "@/app/mcp/route";

describe("POST /mcp", () => {
  test("returns a 401 with resource metadata in WWW-Authenticate", async () => {
    const response = await POST(new Request("https://mcp.ai.winlab.tw/mcp", {
      method: "POST",
    }));

    assert.equal(response.status, 401);
    assert.equal(
      response.headers.get("WWW-Authenticate"),
      'Bearer resource_metadata="https://mcp.ai.winlab.tw/.well-known/oauth-protected-resource/mcp"',
    );

    assert.deepStrictEqual(await response.json(), {
      error: "Missing Authorization header",
    });
  });
});
