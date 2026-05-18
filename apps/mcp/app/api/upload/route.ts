import { verifyMcpToken } from "@/lib/auth/jwt";
import { createClientWithToken, createServiceClient } from "@/lib/supabase/server";

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

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

type ConsumedUploadToken = { user_id: string; category: string };

interface UploadTokenRpcClient {
  rpc(functionName: "consume_upload_token", args: { p_token: string }): PromiseLike<{
    data: unknown;
    error: { message: string } | null;
  }>;
}

export async function consumeUploadToken(
  token: string,
  client: UploadTokenRpcClient
): Promise<ConsumedUploadToken | null> {
  const { data, error } = await client.rpc("consume_upload_token", {
    p_token: token,
  });

  if (error) {
    throw new Error(`Failed to consume upload token: ${error.message}`);
  }

  if (!data || typeof data !== "object") return null;
  const row = data as Partial<ConsumedUploadToken>;
  if (typeof row.user_id !== "string" || typeof row.category !== "string") return null;
  return { user_id: row.user_id, category: row.category };
}

type AuthResult =
  | {
      supabase: ReturnType<typeof createClientWithToken> | ReturnType<typeof createServiceClient>;
      // category is bound to the upload-token flow; for direct Bearer auth the
      // caller provides it on the form.
      category?: string;
    }
  | { error: string };

async function authenticateRequest(request: Request): Promise<AuthResult> {
  const url = new URL(request.url);
  const uploadToken = url.searchParams.get("token");

  // Method 1: One-time upload token (from MCP create_upload_url tool)
  if (uploadToken) {
    // The token RPC is SECURITY DEFINER and accepts anon — that's fine, we're
    // about to upload via service role on the token's recorded user_id. The
    // JWT used to mint the token is no longer stored anywhere.
    const supabaseAnon = createServiceClient();
    const row = await consumeUploadToken(uploadToken, supabaseAnon);

    if (!row) return { error: "Invalid, expired, or already used upload token" };

    return {
      supabase: createServiceClient(),
      category: row.category,
    };
  }

  // Method 2: Bearer token (direct API usage)
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return { error: "Missing authorization" };

  const claims = await verifyMcpToken(token);
  if (!claims) return { error: "Invalid or expired token" };

  return { supabase: createClientWithToken(token) };
}

export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if ("error" in auth) {
    return Response.json({ error: auth.error }, { status: 401 });
  }

  const { supabase } = auth;

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  // Category from form data, or from upload token. Token-bound category wins
  // (it was committed at create_upload_url time and can't be swapped client-side).
  const category =
    auth.category ?? (formData.get("category") as string) ?? "announcement";

  if (!file) {
    return Response.json({ error: "Missing 'file' field" }, { status: 400 });
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return Response.json(
      { error: `Unsupported type: ${file.type}. Allowed: ${ALLOWED_MIME_TYPES.join(", ")}` },
      { status: 400 },
    );
  }

  if (file.size > MAX_SIZE_BYTES) {
    return Response.json(
      { error: `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Max: 5MB` },
      { status: 400 },
    );
  }

  // Extension is derived from the MIME map, not from file.name — caller-supplied
  // filenames can carry path separators or fake extensions.
  const ext = MIME_TO_EXT[file.type] ?? "jpg";
  const prefix = CATEGORY_PREFIXES[category] ?? "";
  const path = `${prefix}${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, new Uint8Array(arrayBuffer), {
      contentType: file.type,
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    return Response.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path);

  return Response.json({ success: true, url: publicUrl, path });
}
