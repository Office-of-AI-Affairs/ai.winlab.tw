import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("resume, display_name")
    .eq("id", id)
    .single();

  if (!profile?.resume) {
    redirect(`/profile/${id}`);
  }

  const res = await fetch(profile.resume);

  if (!res.ok) {
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
