import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

const BUCKET = "announcement-images";
const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 10_000;
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

// upload_image accepts a public URL — make sure it's actually public-internet,
// not pointing at our own infra or cloud metadata endpoints (SSRF).
function assertPublicHttpUrl(raw: string) {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error("invalid URL");
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error(`unsupported scheme: ${parsed.protocol}`);
  }
  const host = parsed.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host === "metadata.google.internal" ||
    host.endsWith(".internal")
  ) {
    throw new Error(`refusing to fetch from internal host: ${host}`);
  }
  // crude IPv4 / IPv6 private range check — DNS rebinding still defeats this
  // (the resolved A record can flip between check and fetch), but the obvious
  // 169.254.169.254 / 10.x / 192.168.x / 127.x cases get caught.
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    const [a, b] = host.split(".").map((n) => Number.parseInt(n, 10));
    if (
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a === 0
    ) {
      throw new Error(`refusing to fetch from private IP: ${host}`);
    }
  }
  if (host === "::1" || host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80")) {
    throw new Error(`refusing to fetch from private IPv6: ${host}`);
  }
}

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

      // upload_tokens no longer stores the caller's JWT — the upload route
      // resolves user_id + category from consume_upload_token (SECURITY DEFINER
      // RPC) and uploads via service-role on behalf of that user.
      const { error: dbError } = await supabase.from("upload_tokens").insert({
        token,
        user_id: userId,
        category,
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
      try {
        assertPublicHttpUrl(url);
      } catch (e) {
        return error(e instanceof Error ? e.message : "URL rejected");
      }

      let response: Response;
      try {
        response = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
      } catch (e) {
        return error(`Failed to download image: ${e instanceof Error ? e.message : String(e)}`);
      }
      if (!response.ok) {
        return error(`Failed to download image: ${response.status} ${response.statusText}`);
      }

      const declared = Number.parseInt(response.headers.get("content-length") ?? "0", 10);
      if (declared > MAX_SIZE_BYTES) {
        return error(`Image too large (declared ${(declared / 1024 / 1024).toFixed(1)}MB). Max: 5MB`);
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
