import ContactEditPageClient from "./client";
import { requireAdminServer } from "@/lib/supabase/require-admin-server";

export default async function ContactEditPage() {
  await requireAdminServer();
  return <ContactEditPageClient />;
}
