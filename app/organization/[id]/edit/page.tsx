import OrganizationMemberEditPageClient from "./client";
import { requireAdminServer } from "@/lib/supabase/require-admin-server";

export default async function OrganizationMemberEditPage() {
  await requireAdminServer();
  return <OrganizationMemberEditPageClient />;
}
