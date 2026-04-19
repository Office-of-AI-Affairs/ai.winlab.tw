"use server";

import { updateTag } from "next/cache";

export async function revalidateContacts() {
  updateTag("contacts");
}
