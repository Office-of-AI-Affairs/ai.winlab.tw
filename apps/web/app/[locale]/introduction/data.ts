import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import type { Introduction, OrganizationMember } from "@winlab/db";

export const getIntroduction = unstable_cache(
  async (): Promise<Introduction | null> => {
    const supabase = createPublicClient();
    const { data } = await supabase.from("introduction").select("*").single();
    return (data as Introduction | null) ?? null;
  },
  ["introduction"],
  { tags: ["introduction"], revalidate: 3600 },
);

export const getOrganizationMembers = unstable_cache(
  async (): Promise<OrganizationMember[]> => {
    const supabase = createPublicClient();
    const { data } = await supabase
      .from("organization_members")
      .select("*")
      .order("group_order", { ascending: true })
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    return (data as OrganizationMember[] | null) ?? [];
  },
  ["organization-members"],
  { tags: ["organization-members"], revalidate: 3600 },
);
