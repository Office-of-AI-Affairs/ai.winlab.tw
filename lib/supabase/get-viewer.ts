import { createClient } from "@/lib/supabase/server"

export async function getViewer() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let role: string | null = null
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()
    role = profile?.role ?? null
  }

  return {
    supabase,
    user,
    role,
    isAdmin: role === "admin",
    isVendor: role === "vendor",
  }
}
