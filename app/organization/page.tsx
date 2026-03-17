import { OrganizationPageClient } from "./client";
import { createClient } from "@/lib/supabase/server";
import type { OrganizationMember, OrganizationMemberCategory } from "@/lib/supabase/types";

const CATEGORIES: OrganizationMemberCategory[] = ["core", "legal_entity", "industry"];

export default async function OrganizationPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let isAdmin = false;
  if (user) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    isAdmin = profile?.role === "admin";
  }

  const { data: allMembers } = await supabase
    .from("organization_members")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  const members = (allMembers as OrganizationMember[]) ?? [];
  const membersByCategory = Object.fromEntries(
    CATEGORIES.map((cat) => [cat, members.filter((m) => m.category === cat)])
  ) as Record<OrganizationMemberCategory, OrganizationMember[]>;

  return <OrganizationPageClient membersByCategory={membersByCategory} isAdmin={isAdmin} />;
}
