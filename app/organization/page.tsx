import { OrganizationPageClient } from "./client";
import { getViewer } from "@/lib/supabase/get-viewer";
import type { OrganizationMember, OrganizationMemberCategory } from "@/lib/supabase/types";

const CATEGORIES: OrganizationMemberCategory[] = ["core", "legal_entity", "industry"];

export default async function OrganizationPage() {
  const { supabase, isAdmin } = await getViewer();

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
