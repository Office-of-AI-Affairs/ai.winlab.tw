import PrivacyEditPageClient from "./client";
import { requireAdminServer } from "@/lib/supabase/require-admin-server";

export default async function PrivacyEditPage() {
  await requireAdminServer();
  return <PrivacyEditPageClient />;
}
