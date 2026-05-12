import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { consumeUploadToken } from "@/app/api/upload/route";

describe("consumeUploadToken", () => {
  test("returns consumed upload token payload", async () => {
    let calledWith: { p_token: string } | null = null;

    const payload = await consumeUploadToken("upload-token", {
      rpc: async (_functionName, args) => {
        calledWith = args;
        return {
          data: {
            user_id: "user-123",
            category: "announcement",
            access_token: "access-token",
          },
          error: null,
        };
      },
    });

    assert.deepStrictEqual(calledWith, { p_token: "upload-token" });
    assert.deepStrictEqual(payload, {
      user_id: "user-123",
      category: "announcement",
      access_token: "access-token",
    });
  });

  test("returns null for invalid or expired tokens", async () => {
    const payload = await consumeUploadToken("upload-token", {
      rpc: async () => ({
        data: null,
        error: null,
      }),
    });

    assert.equal(payload, null);
  });

  test("surfaces RPC failures as explicit errors", async () => {
    await assert.rejects(
      () =>
        consumeUploadToken("upload-token", {
          rpc: async () => ({
            data: null,
            error: { message: "consume failed" },
          }),
        }),
      /consume failed/,
    );
  });
});
