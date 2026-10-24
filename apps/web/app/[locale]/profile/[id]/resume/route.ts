import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/auth/viewer";
import { db } from "@/lib/db";
import { public_profiles } from "@/lib/db/schema";
import { readFile } from "@/lib/files";
import { isUuid } from "@/lib/slug";

// Any signed-in user may read a resume (the old resumes_select_authenticated
// storage policy); visitors go back to the profile.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const viewer = await getViewer();
  if (!viewer || !isUuid(id)) {
    redirect(`/profile/${encodeURIComponent(id)}`);
  }

  // public_profiles mirrors the resume path, so this works for any profile.
  const [profile] = await db
    .select({ resume: public_profiles.resume, display_name: public_profiles.display_name })
    .from(public_profiles)
    .where(eq(public_profiles.id, id))
    .limit(1);
  if (!profile?.resume) {
    redirect(`/profile/${id}`);
  }

  const file = await readFile("resumes", profile.resume);
  if (!file) {
    console.error(`Resume route: file missing for profile ${id}`);
    redirect(`/profile/${id}`);
  }

  const filename = profile.display_name
    ? `${profile.display_name}-resume.pdf`
    : "resume.pdf";

  // RFC 5987: filename="..." for ASCII fallback, filename*=UTF-8'' for non-ASCII (e.g. 中文).
  return new Response(new Uint8Array(file.data), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="resume.pdf"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
