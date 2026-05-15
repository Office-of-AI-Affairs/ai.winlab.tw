import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"

export async function requireMemberOrAdminServer() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "admin" && profile?.role !== "member") {
    redirect("/")
  }

  return { supabase, user, role: profile.role as "admin" | "member" }
}
