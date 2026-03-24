import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  // Auth check: only authenticated users can view resumes
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

  // SSRF protection: only allow fetching from our Supabase storage origin
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (supabaseUrl) {
    try {
      const resumeUrl = new URL(profile.resume);
      const storageOrigin = new URL(supabaseUrl).origin;
      if (resumeUrl.origin !== storageOrigin) {
        redirect(`/profile/${id}`);
      }
    } catch {
      redirect(`/profile/${id}`);
    }
  }

  const res = await fetch(profile.resume);

  if (!res.ok) {
    console.error(`Resume route: upstream fetch failed with status ${res.status} for profile ${id}`);
    redirect(`/profile/${id}`);
  }

  const filename = profile.display_name
    ? `${profile.display_name}-resume.pdf`
    : "resume.pdf";

  return new Response(res.body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${encodeURIComponent(filename)}"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
