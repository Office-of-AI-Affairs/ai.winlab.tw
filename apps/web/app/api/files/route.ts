import { getViewer } from "@/lib/auth/viewer";
import { uploadImageFile, uploadResumeFile } from "@/lib/files/upload";

// Browser uploads: multipart form with `file`, `bucket` and, for images,
// `prefix`. Returns { url, path } for images and { path } for resumes.
export async function POST(request: Request) {
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
