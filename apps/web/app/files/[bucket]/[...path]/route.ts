import { readFile } from "@/lib/files";

// Public images (announcement-images). Resumes are private and only go out
// through /profile/[id]/resume, which checks the viewer.
// Paths carry a timestamp and a random part, so a path never changes
// content and browsers may keep it for a year.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ bucket: string; path: string[] }> },
) {
  const { bucket, path } = await params;
  if (bucket !== "announcement-images") return new Response("Not found", { status: 404 });
  const file = await readFile(bucket, path.join("/"));
  if (!file) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.content_type,
      "Cache-Control": "public, max-age=31536000, immutable",
      // An uploaded SVG must never run script in our origin.
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    },
  });
}
