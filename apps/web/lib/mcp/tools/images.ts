import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { and, eq, gte, sql } from "drizzle-orm";
import { z } from "zod";
import type { Viewer } from "@/lib/auth/viewer";
import { asUser } from "@/lib/db";
import { upload_tokens } from "@/lib/db/schema";
import { uploadImageFile } from "@/lib/files/upload";
import { fetchPublicImage, readBodyCapped } from "@/lib/mcp/fetch-image";
import { error, success } from "@/lib/mcp/tools/common";

const MAX_SIZE_BYTES = 5 * 1024 * 1024;

/** Upload category → folder in announcement-images (lib/files/upload.ts rules apply). */
export const CATEGORY_PREFIXES: Record<string, string> = {
  announcement: "",
  recruitment: "recruitment/",
  result: "results/",
  event: "events/",
  carousel: "carousel/",
  organization: "organization/",
};

const CATEGORIES = ["announcement", "recruitment", "result", "event", "carousel", "organization"] as const;

const baseUrl = process.env.BETTER_AUTH_URL ?? "https://ai.winlab.tw";

/** The stored path (as the site stores it) and a full link to look at. */
export const uploaded = (url: string, path: string) => ({ url, public_url: `${baseUrl}${url}`, path });

export function registerImageTools(server: McpServer, viewer: Viewer) {
  server.tool(
    "create_upload_url",
    `Generate a one-time upload URL for uploading a LOCAL file from disk. Returns a URL that can be used with curl WITHOUT any Authorization header. The URL expires in 10 minutes and can only be used once.

Usage: call this tool first, then use the returned upload_url with curl:
  curl -X POST "<upload_url>" -F "file=@/path/to/local/image.jpg"

The curl response JSON contains { "url": "<path>" } which you can use in other tools.`,
    { category: z.enum(CATEGORIES).describe("Category determines storage path prefix") },
    async ({ category }) => {
      const token = crypto.randomUUID();
      // The upload runs as this user with the usual folder rules.
      await asUser(viewer.id, (tx) => tx.insert(upload_tokens).values({ token, user_id: viewer.id, category }));
      const uploadUrl = `${baseUrl}/api/upload?token=${token}`;
      return success({
        upload_url: uploadUrl,
        expires_in: "10 minutes",
        usage: `curl -X POST "${uploadUrl}" -F "file=@/path/to/image.jpg"`,
      });
    },
  );

  server.tool(
    "upload_image",
    `Upload an image from a public URL to storage. Returns the image path for use in other tools.

For images on the web: use this tool, pass the URL directly.
For LOCAL files on disk: use create_upload_url instead, then curl the file.`,
    {
      url: z.string().url().describe("Public URL of the image to download and upload"),
      category: z.enum(CATEGORIES).describe("Category determines storage path prefix"),
    },
    async ({ url, category }) => {
      let response: Response;
      try {
        // assertPublicHttpUrl runs on the initial URL and on every redirect hop
        response = await fetchPublicImage(url);
      } catch (e) {
        return error(e instanceof Error ? e.message : "URL rejected");
      }
      if (!response.ok) return error(`Failed to download image: ${response.status} ${response.statusText}`);
      const declared = Number.parseInt(response.headers.get("content-length") ?? "0", 10);
      if (declared > MAX_SIZE_BYTES) {
        return error(`Image too large (declared ${(declared / 1024 / 1024).toFixed(1)}MB). Max: 5MB`);
      }
      let bytes: Uint8Array;
      try {
        bytes = await readBodyCapped(response, MAX_SIZE_BYTES);
      } catch {
        return error("Image too large. Max: 5MB");
      }
      // The type comes from the file's first bytes, not the server's header.
      const result = await uploadImageFile(viewer, CATEGORY_PREFIXES[category] ?? "", Buffer.from(bytes));
      return result.ok ? success(uploaded(result.url!, result.path)) : error(result.error);
    },
  );
}

/** Uses a create_upload_url token once; the user and folder it was made for. */
export async function consumeUploadToken(token: string) {
  const [row] = await asUser(null, (tx) =>
    tx
      .update(upload_tokens)
      .set({ used: true })
      .where(and(eq(upload_tokens.token, token), eq(upload_tokens.used, false), gte(upload_tokens.expires_at, sql`now()`)))
      .returning({ user_id: upload_tokens.user_id, category: upload_tokens.category }),
  );
  return row ?? null;
}
