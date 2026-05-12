import { ContactsAdminPageClient } from "./client";
import { requireAdminServer } from "@/lib/supabase/require-admin-server";
import type { Contact } from "@/lib/supabase/types";

export default async function ContactsAdminPage() {
  const { supabase } = await requireAdminServer();
  const { data } = await supabase
    .from("contacts")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  return <ContactsAdminPageClient initialContacts={(data as Contact[]) ?? []} />;
}
