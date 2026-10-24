import { getViewer } from "@/lib/auth/viewer";
import { uploadImageFile, uploadResumeFile } from "@/lib/files/upload";

// Browser uploads: multipart form with `file`, `bucket` and, for images,
// `prefix`. Returns { url, path } for images and { path } for resumes.
const MAX_BODY = 10 * 1024 * 1024 + 64 * 1024; // the file plus form overhead

export async function POST(request: Request) {
  // Browsers send Origin on every POST; refuse anything from another site.
  // Behind the Carrel gateway request.url carries the bind address, so the
  // public origin comes from BETTER_AUTH_URL.
  const origin = request.headers.get("origin");
  const allowed = [new URL(request.url).origin, process.env.BETTER_AUTH_URL && new URL(process.env.BETTER_AUTH_URL).origin];
  if (!origin || !allowed.includes(origin)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  // Refuse a large body before reading it.
  const length = Number(request.headers.get("content-length"));
  if (!Number.isFinite(length) || length <= 0) return Response.json({ error: "Length required" }, { status: 411 });
  if (length > MAX_BODY) return Response.json({ error: "File too large" }, { status: 413 });
  const viewer = await getViewer();
  if (!viewer) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return Response.json({ error: "Missing file" }, { status: 400 });
  const data = Buffer.from(await file.arrayBuffer());
  const bucket = form?.get("bucket");
  const result =
    bucket === "resumes"
      ? await uploadResumeFile(viewer, data)
      : bucket === "announcement-images"
        ? await uploadImageFile(viewer, String(form?.get("prefix") ?? ""), data)
        : ({ ok: false, status: 400, error: "Unknown bucket" } as const);
  if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
  return Response.json({ url: result.url, path: result.path });
}
