import { ContactsAdminPageClient } from "./client";
import { requireAdmin } from "@/lib/auth/viewer";
import { db } from "@/lib/db";
import { contacts } from "@/lib/db/schema";
import { asc } from "drizzle-orm";

export default async function ContactsAdminPage() {
  await requireAdmin();
  const rows = await db.select().from(contacts).orderBy(asc(contacts.sort_order), asc(contacts.created_at));

  return <ContactsAdminPageClient initialContacts={rows} />;
}
