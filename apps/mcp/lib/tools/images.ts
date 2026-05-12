import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

const BUCKET = "announcement-images";
const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

const CATEGORY_PREFIXES: Record<string, string> = {
  announcement: "",
  recruitment: "recruitment/",
  result: "results/",
  event: "events/",
  carousel: "carousel/",
  organization: "organization/",
};

function success(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify({ success: true, data }) }],
  };
}

function error(message: string) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify({ success: false, error: message }) }],
    isError: true,
  };
}

function getExtFromMime(mime: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
  };
  return map[mime] || "jpg";
}

function generatePath(category: string, ext: string): string {
  const prefix = CATEGORY_PREFIXES[category] || "";
  return `${prefix}${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
}

async function uploadToStorage(
  supabase: SupabaseClient,
  path: string,
  buffer: Buffer | Uint8Array,
  contentType: string,
) {
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, {
      contentType,
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) return error(uploadError.message);

  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return success({ url: publicUrl, path });
}

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://mcp.ai.winlab.tw";

export function registerImageTools(
  server: McpServer,
  supabase: SupabaseClient,
  userId: string,
  accessToken: string,
) {
  // --- create_upload_url: for local file uploads ---
  server.tool(
    "create_upload_url",
    `Generate a one-time upload URL for uploading a LOCAL file from disk. Returns a URL that can be used with curl WITHOUT any Authorization header. The URL expires in 10 minutes and can only be used once.

Usage: call this tool first, then use the returned upload_url with curl:
  curl -X POST "<upload_url>" -F "file=@/path/to/local/image.jpg"
The curl response JSON contains { "url": "<public_url>" } which you can use in other tools.`,
    {
      category: z
        .enum([
          "announcement",
          "recruitment",
          "result",
          "event",
          "carousel",
          "organization",
        ])
        .describe("Category determines storage path prefix"),
    },
    async ({ category }) => {
      const token = crypto.randomUUID();

      const { error: dbError } = await supabase.from("upload_tokens").insert({
        token,
        user_id: userId,
        category,
        access_token: accessToken,
      });

      if (dbError) return error(`Failed to create upload token: ${dbError.message}`);

      const uploadUrl = `${baseUrl}/api/upload?token=${token}`;
      return success({
        upload_url: uploadUrl,
        expires_in: "10 minutes",
        usage: `curl -X POST "${uploadUrl}" -F "file=@/path/to/image.jpg"`,
      });
    },
  );

  // --- upload_image: for web URLs ---
  server.tool(
    "upload_image",
    `Upload an image from a public URL to storage. Returns the public URL for use in other tools.

For images on the web: use this tool, pass the URL directly.
For LOCAL files on disk: use create_upload_url instead, then curl the file.`,
    {
      url: z.string().url().describe("Public URL of the image to download and upload"),
      category: z
        .enum([
          "announcement",
          "recruitment",
          "result",
          "event",
          "carousel",
          "organization",
        ])
        .describe("Category determines storage path prefix"),
    },
    async ({ url, category }) => {
      const response = await fetch(url);
      if (!response.ok) {
        return error(`Failed to download image: ${response.status} ${response.statusText}`);
      }

      const contentType = response.headers.get("content-type")?.split(";")[0] || "image/jpeg";
      if (!ALLOWED_MIME_TYPES.includes(contentType)) {
        return error(`Unsupported image type: ${contentType}. Allowed: ${ALLOWED_MIME_TYPES.join(", ")}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      if (arrayBuffer.byteLength > MAX_SIZE_BYTES) {
        return error(`Image too large: ${(arrayBuffer.byteLength / 1024 / 1024).toFixed(1)}MB. Max: 5MB`);
      }

      const ext = getExtFromMime(contentType);
      const path = generatePath(category, ext);

      return uploadToStorage(supabase, path, new Uint8Array(arrayBuffer), contentType);
    },
  );
}
