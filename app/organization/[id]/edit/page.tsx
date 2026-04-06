import { OrganizationMemberEditClient } from "./client";
import { requireAdminServer } from "@/lib/supabase/require-admin-server";
import type { OrganizationMember } from "@/lib/supabase/types";
import { redirect } from "next/navigation";

export default async function OrganizationMemberEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await requireAdminServer();

  const { data, error } = await supabase
    .from("organization_members")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    redirect("/organization");
  }

  return (
    <OrganizationMemberEditClient
      id={id}
      initialMember={data as OrganizationMember}
    />
  );
}
