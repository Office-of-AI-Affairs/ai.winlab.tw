import { readFile } from "@/lib/files";
import { verifyResumeSignature } from "@/lib/files/signed";

// Public images (announcement-images). Resumes are private: they go out
// through /profile/[id]/resume, which checks the viewer, or here with a
// signed, expiring link (lib/files/signed.ts) handed to MCP clients.
// Paths carry a timestamp and a random part, so a path never changes
// content and browsers may keep it for a year.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ bucket: string; path: string[] }> },
) {
  const { bucket, path } = await params;
  if (bucket === "resumes") {
    const url = new URL(request.url);
    const filePath = path.join("/");
    if (!verifyResumeSignature(filePath, url.searchParams.get("expires"), url.searchParams.get("sig"))) {
      return new Response("Not found", { status: 404 });
    }
    const resume = await readFile("resumes", filePath);
    if (!resume) return new Response("Not found", { status: 404 });
    return new Response(new Uint8Array(resume.data), {
      headers: { "Content-Type": "application/pdf", "Cache-Control": "private, no-store" },
    });
  }
  if (bucket !== "announcement-images") return new Response("Not found", { status: 404 });
  const file = await readFile(bucket, path.join("/"));
  if (!file) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.content_type,
      "Cache-Control": "public, max-age=31536000, immutable",
      // nosniff and a sandboxing CSP come from next.config.ts headers().
    },
  });
}
