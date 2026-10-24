import { ContactEditClient } from "./client";
import { requireAdmin } from "@/lib/auth/viewer";
import { db } from "@/lib/db";
import { contacts } from "@/lib/db/schema";
import { isUuid } from "@/lib/slug";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

export default async function ContactEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireAdmin();
  if (!isUuid(id)) redirect("/contacts");

  const [contact] = await db.select().from(contacts).where(eq(contacts.id, id)).limit(1);
  if (!contact) redirect("/contacts");

  return <ContactEditClient id={id} initialContact={contact} />;
}
