import { requireMcpAuth } from "@better-auth/mcp";
import { auth, mcpResource } from "@/lib/auth";
import { viewerById, type Viewer } from "@/lib/auth/viewer";
import { uploadImageFile } from "@/lib/files/upload";
import { CATEGORY_PREFIXES, consumeUploadToken, uploaded } from "@/lib/mcp/tools/images";

const MAX_BYTES = 5 * 1024 * 1024;
const jwksUrl = `http://127.0.0.1:${process.env.PORT ?? 3000}/api/auth/jwks`;

// Local-file uploads for MCP clients. Either a one-time token from the
// create_upload_url tool (no Authorization header, so plain curl works), or
// an MCP bearer token. Both upload as that user, under the same folder rules
// as the site (lib/files/upload.ts).
async function upload(request: Request, viewer: Viewer, category: string) {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_BYTES + 64 * 1024) return Response.json({ error: "File too large. Max: 5MB" }, { status: 413 });
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return Response.json({ error: "Missing 'file' field" }, { status: 400 });
  if (file.size > MAX_BYTES) return Response.json({ error: "File too large. Max: 5MB" }, { status: 400 });
  const result = await uploadImageFile(viewer, CATEGORY_PREFIXES[category] ?? "", Buffer.from(await file.arrayBuffer()));
  if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
  return Response.json({ success: true, ...uploaded(result.url!, result.path) });
}

const withBearer = requireMcpAuth(
  auth,
  async (request, claims) => {
    const viewer = claims.sub ? await viewerById(claims.sub) : null;
    if (!viewer) return Response.json({ error: "Invalid token" }, { status: 401 });
    const category = new URL(request.url).searchParams.get("category") ?? "announcement";
    return upload(request, viewer, category);
  },
  { resource: mcpResource, jwksUrl },
);

export async function POST(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  if (!token) return withBearer(request);
  const row = await consumeUploadToken(token);
  const viewer = row ? await viewerById(row.user_id) : null;
  if (!row || !viewer) return Response.json({ error: "Invalid, expired, or already used upload token" }, { status: 401 });
  return upload(request, viewer, row.category);
}
