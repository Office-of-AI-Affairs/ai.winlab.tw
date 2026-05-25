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

  // Read the resume path from public_profiles, not profiles. profiles SELECT
  // RLS is tightened to self / admin / recruitment_owner-of-applicant
  // (20260518000001), so a viewer hitting another member's /resume route would
  // otherwise always fall through to the redirect. public_profiles mirrors the
  // path (20260525000002) precisely to keep this lookup readable; the actual
  // PDF download below still runs as the viewer's session, gated by the
  // resumes_select_authenticated storage policy.
  const { data: profile, error: profileError } = await supabase
    .from("public_profiles")
    .select("resume, display_name")
    .eq("id", id)
    .single();

  if (profileError) {
    console.error("Resume route: public_profiles query failed:", profileError);
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
