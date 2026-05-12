import { ContactEditClient } from "./client";
import { requireAdminServer } from "@/lib/supabase/require-admin-server";
import type { Contact } from "@/lib/supabase/types";
import { redirect } from "next/navigation";

export default async function ContactEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await requireAdminServer();

  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    redirect("/contacts");
  }

  return <ContactEditClient id={id} initialContact={data as Contact} />;
}
