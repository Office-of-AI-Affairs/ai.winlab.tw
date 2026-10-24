import { OrganizationMemberEditClient } from "./client";
import { requireAdmin } from "@/lib/auth/viewer";
import { db } from "@/lib/db";
import { organization_members } from "@/lib/db/schema";
import { isUuid } from "@/lib/db/uuid";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

export default async function OrganizationMemberEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireAdmin();
  if (!isUuid(id)) redirect("/introduction");

  const [member] = await db
    .select()
    .from(organization_members)
    .where(eq(organization_members.id, id))
    .limit(1);
  if (!member) redirect("/introduction");

  return <OrganizationMemberEditClient id={id} initialMember={member} />;
}
