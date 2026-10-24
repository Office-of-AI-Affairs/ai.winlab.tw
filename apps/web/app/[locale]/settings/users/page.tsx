import SettingsUsersPageClient from "./client";
import { listUsers } from "@/lib/actions/users";
import { requireAdmin } from "@/lib/auth/viewer";

export default async function SettingsUsersPage() {
  await requireAdmin();
  return <SettingsUsersPageClient initialUsers={await listUsers()} />;
}
