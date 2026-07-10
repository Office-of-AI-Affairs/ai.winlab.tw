import SettingsUsersPageClient from "./client";
import type { UserRow } from "@/components/users-table";
import { requireAdminServer } from "@/lib/supabase/require-admin-server";

export default async function SettingsUsersPage() {
  const { supabase } = await requireAdminServer();
  const { data } = await supabase.rpc("get_all_users");

  return <SettingsUsersPageClient initialUsers={(data as UserRow[]) ?? []} />;
}
