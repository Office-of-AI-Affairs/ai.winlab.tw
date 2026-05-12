import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/profile/${id}`);
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("resume, display_name")
    .eq("id", id)
    .single();

  if (profileError) {
    console.error("Resume route: profile query failed:", profileError);
  }

  if (!profile?.resume) {
    redirect(`/profile/${id}`);
  }

  const { data: blob, error: downloadError } = await supabase.storage
    .from("resumes")
    .download(profile.resume);

  if (downloadError || !blob) {
    console.error(`Resume route: download failed for profile ${id}:`, downloadError);
    redirect(`/profile/${id}`);
  }

  const filename = profile.display_name
    ? `${profile.display_name}-resume.pdf`
    : "resume.pdf";

  // RFC 5987: filename="..." for ASCII fallback, filename*=UTF-8'' for non-ASCII (e.g. 中文).
  return new Response(blob, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="resume.pdf"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "private, no-store",
    },
  });
}
